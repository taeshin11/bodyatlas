"""
gen_brain_mri_hybrid.py

Hybrid Brain MRI atlas: FastSurfer (95 regions) + MedSAM refinement for subcortical structures.

Pipeline:
  1. FastSurfer (Apache 2.0) provides base parcellation (95 DKT regions)
  2. MedSAM (Apache 2.0) refines boundaries for small subcortical structures
     where it outperforms FastSurfer-alone contour extraction (Dice > 0.8)
  3. Large structures (cortex, white matter) keep FastSurfer masks as-is

Tested: MedSAM Dice on subcortical = 0.82-0.87 vs 0.45-0.61 on large structures.
Only structures where MedSAM adds value get refined.

Usage:
    conda activate sam3
    python scripts/gen_brain_mri_hybrid.py
"""

import json
import shutil
import sys
from pathlib import Path

import numpy as np
import nibabel as nib
from PIL import Image
import torch

PROJECT_ROOT = Path(__file__).parent.parent
OUT_DIR = PROJECT_ROOT / "public/data/brain-mri-commercial"

FASTSURFER_SEG = Path("D:/ImageLabelAPI_SPINAI/outputs/brain_atlas_test/fastsurfer_out/sub01/mri/aparc.DKTatlas+aseg.deep.mgz")
T1_ORIG = Path("D:/ImageLabelAPI_SPINAI/outputs/brain_atlas_test/fastsurfer_out/sub01/mri/orig.mgz")
MEDSAM_CKPT = Path("D:/ImageLabelAPI_SPINAI/outputs/MedSAM/work_dir/MedSAM/medsam_vit_b.pth")

# Subcortical structures where MedSAM refines well (Dice > 0.8 in testing)
MEDSAM_REFINE_LABELS = {
    10, 49,   # Thalamus L/R
    11, 50,   # Caudate L/R
    12, 51,   # Putamen L/R
    13, 52,   # Pallidum L/R
    17, 53,   # Hippocampus L/R
    18, 54,   # Amygdala L/R
    26, 58,   # Accumbens L/R
    28, 60,   # Ventral DC L/R
}

# Full FS label map (same as gen_brain_mri_commercial.py)
FS_LABELS = {
    2: ("Left Cerebral White Matter", "좌측 대뇌 백질", "brain", "#E0E0E0"),
    4: ("Left Lateral Ventricle", "좌측 측뇌실", "cavity", "#8B5CF6"),
    5: ("Left Inf Lat Ventricle", "좌측 하측뇌실", "cavity", "#8B5CF6"),
    7: ("Left Cerebellum White Matter", "좌측 소뇌 백질", "brain", "#D4D4D4"),
    8: ("Left Cerebellum Cortex", "좌측 소뇌 피질", "brain", "#EC4899"),
    10: ("Left Thalamus", "좌측 시상", "brain", "#F59E0B"),
    11: ("Left Caudate", "좌측 미상핵", "brain", "#10B981"),
    12: ("Left Putamen", "좌측 조가비핵", "brain", "#3B82F6"),
    13: ("Left Pallidum", "좌측 담창구", "brain", "#6366F1"),
    14: ("3rd Ventricle", "제3뇌실", "cavity", "#A78BFA"),
    15: ("4th Ventricle", "제4뇌실", "cavity", "#A78BFA"),
    16: ("Brain Stem", "뇌간", "brain", "#EF4444"),
    17: ("Left Hippocampus", "좌측 해마", "brain", "#F97316"),
    18: ("Left Amygdala", "좌측 편도체", "brain", "#E11D48"),
    24: ("CSF", "뇌척수액", "cavity", "#93C5FD"),
    26: ("Left Accumbens", "좌측 측좌핵", "brain", "#14B8A6"),
    28: ("Left Ventral DC", "좌측 복측 간뇌", "brain", "#8B5CF6"),
    31: ("Left Choroid Plexus", "좌측 맥락얼기", "other", "#CBD5E1"),
    41: ("Right Cerebral White Matter", "우측 대뇌 백질", "brain", "#E0E0E0"),
    43: ("Right Lateral Ventricle", "우측 측뇌실", "cavity", "#8B5CF6"),
    44: ("Right Inf Lat Ventricle", "우측 하측뇌실", "cavity", "#8B5CF6"),
    46: ("Right Cerebellum White Matter", "우측 소뇌 백질", "brain", "#D4D4D4"),
    47: ("Right Cerebellum Cortex", "우측 소뇌 피질", "brain", "#EC4899"),
    49: ("Right Thalamus", "우측 시상", "brain", "#F59E0B"),
    50: ("Right Caudate", "우측 미상핵", "brain", "#10B981"),
    51: ("Right Putamen", "우측 조가비핵", "brain", "#3B82F6"),
    52: ("Right Pallidum", "우측 담창구", "brain", "#6366F1"),
    53: ("Right Hippocampus", "우측 해마", "brain", "#F97316"),
    54: ("Right Amygdala", "우측 편도체", "brain", "#E11D48"),
    58: ("Right Accumbens", "우측 측좌핵", "brain", "#14B8A6"),
    60: ("Right Ventral DC", "우측 복측 간뇌", "brain", "#8B5CF6"),
    63: ("Right Choroid Plexus", "우측 맥락얼기", "other", "#CBD5E1"),
    77: ("WM Hypointensities", "백질 저신호 병변", "other", "#94A3B8"),
    1002: ("L Caudal Anterior Cingulate", "좌 전방대상회(미측)", "brain", "#FF6B6B"),
    1003: ("L Caudal Middle Frontal", "좌 중전두회(미측)", "brain", "#4ECDC4"),
    1005: ("L Cuneus", "좌 설상엽", "brain", "#45B7D1"),
    1006: ("L Entorhinal", "좌 내후각피질", "brain", "#96CEB4"),
    1007: ("L Fusiform", "좌 방추회", "brain", "#FFEAA7"),
    1008: ("L Inferior Parietal", "좌 하두정소엽", "brain", "#DDA0DD"),
    1009: ("L Inferior Temporal", "좌 하측두회", "brain", "#98D8C8"),
    1010: ("L Isthmus Cingulate", "좌 협부대상회", "brain", "#F7DC6F"),
    1011: ("L Lateral Occipital", "좌 외측후두엽", "brain", "#BB8FCE"),
    1012: ("L Lateral Orbitofrontal", "좌 외측안와전두", "brain", "#85C1E9"),
    1013: ("L Lingual", "좌 설회", "brain", "#82E0AA"),
    1014: ("L Medial Orbitofrontal", "좌 내측안와전두", "brain", "#F8C471"),
    1015: ("L Middle Temporal", "좌 중측두회", "brain", "#C39BD3"),
    1016: ("L Parahippocampal", "좌 해마방회", "brain", "#7DCEA0"),
    1017: ("L Paracentral", "좌 중심방소엽", "brain", "#F0B27A"),
    1018: ("L Pars Opercularis", "좌 변연부", "brain", "#AED6F1"),
    1019: ("L Pars Orbitalis", "좌 안와부", "brain", "#A3E4D7"),
    1020: ("L Pars Triangularis", "좌 삼각부", "brain", "#FAD7A0"),
    1021: ("L Pericalcarine", "좌 조거주위", "brain", "#D7BDE2"),
    1022: ("L Postcentral", "좌 중심후회", "brain", "#A9DFBF"),
    1023: ("L Posterior Cingulate", "좌 후방대상회", "brain", "#F5CBA7"),
    1024: ("L Precentral", "좌 중심전회", "brain", "#AEB6BF"),
    1025: ("L Precuneus", "좌 쐐기앞소엽", "brain", "#D5F5E3"),
    1026: ("L Rostral Ant Cingulate", "좌 전방대상회(문측)", "brain", "#FADBD8"),
    1027: ("L Rostral Middle Frontal", "좌 중전두회(문측)", "brain", "#D6EAF8"),
    1028: ("L Superior Frontal", "좌 상전두회", "brain", "#E8DAEF"),
    1029: ("L Superior Parietal", "좌 상두정소엽", "brain", "#D5D8DC"),
    1030: ("L Superior Temporal", "좌 상측두회", "brain", "#ABEBC6"),
    1031: ("L Supramarginal", "좌 연상회", "brain", "#F9E79F"),
    1034: ("L Transverse Temporal", "좌 횡측두회", "brain", "#D2B4DE"),
    1035: ("L Insula", "좌 뇌섬엽", "brain", "#A9CCE3"),
    2002: ("R Caudal Anterior Cingulate", "우 전방대상회(미측)", "brain", "#FF6B6B"),
    2003: ("R Caudal Middle Frontal", "우 중전두회(미측)", "brain", "#4ECDC4"),
    2005: ("R Cuneus", "우 설상엽", "brain", "#45B7D1"),
    2006: ("R Entorhinal", "우 내후각피질", "brain", "#96CEB4"),
    2007: ("R Fusiform", "우 방추회", "brain", "#FFEAA7"),
    2008: ("R Inferior Parietal", "우 하두정소엽", "brain", "#DDA0DD"),
    2009: ("R Inferior Temporal", "우 하측두회", "brain", "#98D8C8"),
    2010: ("R Isthmus Cingulate", "우 협부대상회", "brain", "#F7DC6F"),
    2011: ("R Lateral Occipital", "우 외측후두엽", "brain", "#BB8FCE"),
    2012: ("R Lateral Orbitofrontal", "우 외측안와전두", "brain", "#85C1E9"),
    2013: ("R Lingual", "우 설회", "brain", "#82E0AA"),
    2014: ("R Medial Orbitofrontal", "우 내측안와전두", "brain", "#F8C471"),
    2015: ("R Middle Temporal", "우 중측두회", "brain", "#C39BD3"),
    2016: ("R Parahippocampal", "우 해마방회", "brain", "#7DCEA0"),
    2017: ("R Paracentral", "우 중심방소엽", "brain", "#F0B27A"),
    2018: ("R Pars Opercularis", "우 변연부", "brain", "#AED6F1"),
    2019: ("R Pars Orbitalis", "우 안와부", "brain", "#A3E4D7"),
    2020: ("R Pars Triangularis", "우 삼각부", "brain", "#FAD7A0"),
    2021: ("R Pericalcarine", "우 조거주위", "brain", "#D7BDE2"),
    2022: ("R Postcentral", "우 중심후회", "brain", "#A9DFBF"),
    2023: ("R Posterior Cingulate", "우 후방대상회", "brain", "#F5CBA7"),
    2024: ("R Precentral", "우 중심전회", "brain", "#AEB6BF"),
    2025: ("R Precuneus", "우 쐐기앞소엽", "brain", "#D5F5E3"),
    2026: ("R Rostral Ant Cingulate", "우 전방대상회(문측)", "brain", "#FADBD8"),
    2027: ("R Rostral Middle Frontal", "우 중전두회(문측)", "brain", "#D6EAF8"),
    2028: ("R Superior Frontal", "우 상전두회", "brain", "#E8DAEF"),
    2029: ("R Superior Parietal", "우 상두정소엽", "brain", "#D5D8DC"),
    2030: ("R Superior Temporal", "우 상측두회", "brain", "#ABEBC6"),
    2031: ("R Supramarginal", "우 연상회", "brain", "#F9E79F"),
    2034: ("R Transverse Temporal", "우 횡측두회", "brain", "#D2B4DE"),
    2035: ("R Insula", "우 뇌섬엽", "brain", "#A9CCE3"),
}

sys.path.insert(0, str(PROJECT_ROOT / "scripts"))
from gen_head_ct_atlas import mask_to_contours


def mri_to_png(sl):
    if sl.max() > 0:
        p1, p99 = np.percentile(sl[sl > 0], [1, 99])
    else:
        p1, p99 = 0, 1
    arr = np.clip(sl, p1, p99)
    arr = ((arr - p1) / max(p99 - p1, 1) * 255).astype(np.uint8)
    return Image.fromarray(arr)


def mri_slice_to_rgb(sl):
    """Convert MRI float slice to uint8 RGB for MedSAM."""
    if sl.max() > 0:
        p1, p99 = np.percentile(sl[sl > 0], [1, 99])
    else:
        p1, p99 = 0, 1
    arr = np.clip(sl, p1, p99)
    arr = ((arr - p1) / max(p99 - p1, 1) * 255).astype(np.uint8)
    return np.stack([arr, arr, arr], axis=-1)


def get_bbox(mask, pad=5):
    """Bounding box [x1, y1, x2, y2] from binary mask."""
    ys, xs = np.where(mask > 0)
    if len(ys) == 0:
        return None
    h, w = mask.shape
    return np.array([
        max(0, xs.min() - pad), max(0, ys.min() - pad),
        min(w - 1, xs.max() + pad), min(h - 1, ys.max() + pad)
    ])


def medsam_predict(medsam_model, image_rgb, bbox, device):
    """Run MedSAM inference: 1024x1024 resize → encoder → decoder → original size."""
    H, W = image_rgb.shape[:2]

    # Resize to 1024x1024 for MedSAM
    img_1024 = np.array(Image.fromarray(image_rgb).resize((1024, 1024), Image.BILINEAR))
    img_tensor = (
        torch.tensor(img_1024).float().permute(2, 0, 1).unsqueeze(0).to(device) / 255.0
    )

    # Scale bbox
    sx, sy = 1024 / W, 1024 / H
    bbox_1024 = torch.tensor(
        [bbox[0] * sx, bbox[1] * sy, bbox[2] * sx, bbox[3] * sy]
    ).float().unsqueeze(0).to(device)

    with torch.no_grad():
        img_embed = medsam_model.image_encoder(img_tensor)
        sparse, dense = medsam_model.prompt_encoder(
            points=None, boxes=bbox_1024, masks=None
        )
        mask_pred, _ = medsam_model.mask_decoder(
            image_embeddings=img_embed,
            image_pe=medsam_model.prompt_encoder.get_dense_pe(),
            sparse_prompt_embeddings=sparse,
            dense_prompt_embeddings=dense,
            multimask_output=False,
        )

    mask_pred = torch.nn.functional.interpolate(
        mask_pred, size=(H, W), mode="bilinear", align_corners=False
    )
    return (mask_pred.squeeze().cpu().numpy() > 0).astype(np.uint8)


def refine_mask_with_medsam(fs_mask, medsam_mask):
    """Combine FastSurfer + MedSAM: intersection-weighted blend.

    Strategy: Use MedSAM boundary but constrain to FastSurfer neighborhood.
    - Where both agree → keep (high confidence)
    - Where only MedSAM says yes → keep if within 3px of FS boundary (boundary refinement)
    - Where only FS says yes → keep if not near MedSAM boundary (interior preservation)
    """
    from scipy.ndimage import binary_dilation

    # Both agree = high confidence core
    both = (fs_mask > 0) & (medsam_mask > 0)

    # MedSAM-only regions near FS boundary = boundary refinement
    fs_dilated = binary_dilation(fs_mask > 0, iterations=3)
    medsam_only_near_fs = (medsam_mask > 0) & (~(fs_mask > 0)) & fs_dilated

    # FS-only regions not contradicted = interior
    medsam_dilated = binary_dilation(medsam_mask > 0, iterations=3)
    fs_only_interior = (fs_mask > 0) & (~(medsam_mask > 0)) & (~medsam_dilated)

    refined = (both | medsam_only_near_fs | fs_only_interior).astype(np.uint8)
    return refined


def main():
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print("=" * 60)
    print("Hybrid Brain MRI Atlas: FastSurfer + MedSAM refinement")
    print(f"Device: {device}")
    if device.type == "cuda":
        print(f"GPU: {torch.cuda.get_device_name(0)}")
        print(f"VRAM: {torch.cuda.mem_get_info()[0]//1024//1024}MB free")
    print("=" * 60)

    # Load volumes
    print("\n[1/5] Loading volumes...")
    t1_data = np.asarray(nib.load(T1_ORIG).dataobj).astype(np.float32)
    seg_data = np.asarray(nib.load(FASTSURFER_SEG).dataobj).astype(np.int32)
    spacing = nib.load(T1_ORIG).header.get_zooms()
    print(f"  Shape: {t1_data.shape}, spacing: {spacing}")

    # Load MedSAM
    print("\n[2/5] Loading MedSAM...")
    from segment_anything import sam_model_registry
    medsam_model = sam_model_registry["vit_b"](checkpoint=str(MEDSAM_CKPT))
    medsam_model.to(device).eval()
    print(f"  MedSAM loaded ({MEDSAM_CKPT.stat().st_size} bytes)")
    if device.type == "cuda":
        print(f"  VRAM after load: {torch.cuda.mem_get_info()[0]//1024//1024}MB free")

    # Clean output
    print("\n[3/5] Preparing output directory...")
    for sub in ["axial", "sagittal", "coronal", "labels"]:
        p = OUT_DIR / sub
        if p.exists():
            shutil.rmtree(p)

    # Build structure list
    present = set(np.unique(seg_data)) - {0}
    active_labels = {k: v for k, v in FS_LABELS.items() if k in present}
    print(f"  Active structures: {len(active_labels)}")
    print(f"  MedSAM-refined structures: {len(MEDSAM_REFINE_LABELS & present)}")

    structures = []
    label_to_struct = {}
    for idx, (label_id, (en, ko, cat, color)) in enumerate(sorted(active_labels.items())):
        name = en.lower().replace(" ", "_").replace("(", "").replace(")", "")
        s = {
            "id": idx, "name": name,
            "displayName": {
                "en": en, "ko": ko,
                "ja": en, "zh": en, "es": en, "de": en, "fr": en,
            },
            "category": cat, "color": color,
            "refined": label_id in MEDSAM_REFINE_LABELS,
            "bestSlice": {}, "sliceRange": {},
        }
        structures.append(s)
        label_to_struct[label_id] = s

    # Process all planes
    planes = {
        "sagittal": (0, t1_data.shape[0]),
        "coronal":  (1, t1_data.shape[1]),
        "axial":    (2, t1_data.shape[2]),
    }

    refined_count = 0
    total_slices = 0

    print("\n[4/5] Generating atlas slices with hybrid refinement...")
    for plane_name, (axis, n_slices) in planes.items():
        img_dir = OUT_DIR / plane_name
        label_dir = OUT_DIR / "labels" / plane_name
        img_dir.mkdir(parents=True, exist_ok=True)
        label_dir.mkdir(parents=True, exist_ok=True)
        print(f"\n  {plane_name}: {n_slices} slices")

        for si in range(n_slices):
            # Extract slice
            if axis == 0:
                t1_sl = t1_data[si, :, :]
                seg_sl = seg_data[si, :, :]
            elif axis == 1:
                t1_sl = t1_data[:, si, :]
                seg_sl = seg_data[:, si, :]
            else:
                t1_sl = t1_data[:, :, si]
                seg_sl = seg_data[:, :, si]

            t1_disp = np.flipud(t1_sl.T).astype(np.float32)
            seg_disp = np.flipud(seg_sl.T).astype(np.int32)

            # Save image PNG
            mri_to_png(t1_disp).save(img_dir / f"{si:04d}.png")

            # Check if any refinement targets are in this slice
            slice_refine_labels = set()
            for lid in MEDSAM_REFINE_LABELS:
                if lid in label_to_struct and np.any(seg_disp == lid):
                    slice_refine_labels.add(lid)

            # Only compute MedSAM image embedding once per slice if needed
            image_rgb = None
            if slice_refine_labels:
                image_rgb = mri_slice_to_rgb(t1_disp)

            # Process each structure
            slice_labels = []
            for label_id, struct in label_to_struct.items():
                fs_mask = (seg_disp == label_id).astype(np.uint8)
                if fs_mask.max() == 0:
                    continue

                # Decide: refine with MedSAM or use FastSurfer as-is
                if label_id in slice_refine_labels and fs_mask.sum() > 30:
                    bbox = get_bbox(fs_mask, pad=5)
                    if bbox is not None:
                        try:
                            medsam_mask = medsam_predict(medsam_model, image_rgb, bbox, device)
                            final_mask = refine_mask_with_medsam(fs_mask, medsam_mask)
                            # Sanity: refined mask should be at least 30% of FS mask
                            if final_mask.sum() >= fs_mask.sum() * 0.3:
                                contours = mask_to_contours(final_mask)
                                refined_count += 1
                            else:
                                contours = mask_to_contours(fs_mask)
                        except Exception:
                            contours = mask_to_contours(fs_mask)
                    else:
                        contours = mask_to_contours(fs_mask)
                else:
                    contours = mask_to_contours(fs_mask)

                if not contours:
                    continue

                slice_labels.append({
                    "id": struct["id"], "name": struct["name"], "contours": contours
                })

                r = struct["sliceRange"].setdefault(plane_name, [si, si])
                r[0] = min(r[0], si)
                r[1] = max(r[1], si)

            with open(label_dir / f"{si:04d}.json", "w") as f:
                json.dump(slice_labels, f)

            total_slices += 1
            if total_slices % 50 == 0:
                print(f"    {plane_name} slice {si}/{n_slices} (refined: {refined_count})")

        # Best slice per structure per plane
        for s in structures:
            r = s["sliceRange"].get(plane_name)
            s["bestSlice"][plane_name] = (r[0] + r[1]) // 2 if r else n_slices // 2

    # Free GPU
    del medsam_model
    torch.cuda.empty_cache()

    # Write info.json
    print("\n[5/5] Writing metadata...")
    info = {
        "planes": {p: {"slices": int(n)} for p, (_, n) in planes.items()},
        "window": {"center": 0, "width": 0},
        "voxelSpacing": [round(float(s), 2) for s in spacing],
    }
    with open(OUT_DIR / "info.json", "w") as f:
        json.dump(info, f, indent=2)

    # Write structures.json (remove internal 'refined' flag before saving)
    active = [s for s in structures if s.get("sliceRange")]
    for s in active:
        s.pop("refined", None)
    with open(OUT_DIR / "structures.json", "w", encoding="utf-8") as f:
        json.dump({"totalStructures": len(active), "structures": active},
                  f, ensure_ascii=False)

    print(f"\n{'=' * 60}")
    print(f"Hybrid atlas complete: {len(active)} structures -> {OUT_DIR}")
    print(f"  Total slices processed: {total_slices}")
    print(f"  MedSAM refinements applied: {refined_count}")
    print(f"License: ALL COMMERCIAL USE OK")
    print(f"  Image: OpenNeuro CC0")
    print(f"  FastSurfer: Apache 2.0")
    print(f"  MedSAM: Apache 2.0")
    print(f"{'=' * 60}")


if __name__ == "__main__":
    main()
