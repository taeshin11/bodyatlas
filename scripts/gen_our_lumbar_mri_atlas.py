"""
gen_our_lumbar_mri_atlas.py

Generates lumbar MRI atlas from unet_mri_c26 model predictions.
26-class segmentation: L1-S1 vertebrae, 5 discs, spinal cord, + 13 abdominal organs.

Source: SPIDER_lumbar dataset (T2-weighted sagittal)
Output: public/data/our-lumbar-mri/
License: Apache 2.0 (own model)

Usage
-----
    python scripts/gen_our_lumbar_mri_atlas.py
    python scripts/gen_our_lumbar_mri_atlas.py --case 1
"""
import argparse
import json
import shutil
import sys
from pathlib import Path

import numpy as np
from PIL import Image

PROJECT_ROOT = Path(__file__).resolve().parent.parent
SPINAI_ROOT = Path("D:/ImageLabelAPI_SPINAI")
sys.path.insert(0, str(SPINAI_ROOT / "src"))
sys.path.insert(0, str(PROJECT_ROOT / "scripts"))

from _log_utils import Logger, Stage, install_excepthook
from gen_head_ct_atlas import mask_to_contours, build_display_name, CATEGORY_COLORS

log = Logger("gen_our_lumbar_mri", log_file=PROJECT_ROOT / "scripts" / "monitor_log.txt")
install_excepthook(log)

CHECKPOINT_MRI = SPINAI_ROOT / "outputs" / "models" / "unet_mri_c26_20260417_212345" / "best_model.pth"
SPIDER_BASE = SPINAI_ROOT / "data" / "cat_F_opensource" / "SPIDER_lumbar"
OUT_DIR = PROJECT_ROOT / "public" / "data" / "our-lumbar-mri"


def get_category(name: str) -> str:
    """Map MRI26 class name -> category."""
    n = name.lower()
    if n.startswith("disc"):
        return "disc"
    if n in {"l1","l2","l3","l4","l5","s1","sacrum"}:
        return "bone"
    if n == "spinal_cord":
        return "nerve"
    if n in {"aorta","vena_cava"}:
        return "vessel"
    if n in {"liver","spleen","pancreas","kidney_lt","kidney_rt","gallbladder",
             "stomach","bladder","prostate_uterus","adrenal_gland"}:
        return "organ"
    return "other"


def mri_to_png_slice(sl: np.ndarray) -> Image.Image:
    """Percentile normalization for MRI display."""
    p1, p99 = np.percentile(sl, (1, 99))
    arr = np.clip(sl, p1, p99)
    arr = ((arr - p1) / (p99 - p1 + 1e-7) * 255).astype(np.uint8)
    return Image.fromarray(arr)


def load_mri_volume(mha_path: Path):
    """Load SPIDER MRI. SPIDER is sagittal-acquired: sitk Z axis = HF, sitk X = LR (slice thickness).

    Returns vol in (X, Y, Z) = (AP=448, LR=50, HF=578) convention for atlas builder.
    """
    import SimpleITK as sitk
    img = sitk.ReadImage(str(mha_path))
    arr = sitk.GetArrayFromImage(img)  # sitk gives (Z, Y, X) = (HF=578, AP=448, LR=50)
    spacing = img.GetSpacing()  # (sx, sy, sz) = (LR_spacing=3.32, AP_spacing=0.625, HF_spacing=0.5)
    vol = np.transpose(arr, (1, 2, 0))  # (AP=448, LR=50, HF=578)
    return vol, spacing, img


def run_inference(vol: np.ndarray, ckpt: Path) -> np.ndarray:
    """Run unet_mri_c26 along sagittal slice direction.

    vol shape: (AP=448, LR=50, HF=578). For SPIDER (sagittal MRI), the ACQUIRED slice
    plane is sagittal = through LR. Model was trained on sagittal slices too (via SPIDER
    data). So predict_volume must see (LR, HF, AP) = 50 sagittal slices of 578x448.
    """
    from inference.predictor import SpinAIPredictor
    predictor = SpinAIPredictor(checkpoints={"mri": str(ckpt)})
    vol_zhw = np.transpose(vol, (1, 2, 0))  # (LR=50, HF=578, AP=448)
    mask_zhw = predictor.predict_volume(vol_zhw, "mri", batch_size=2)
    return np.transpose(mask_zhw, (2, 0, 1))  # back to (AP, LR, HF)


def build_atlas(vol: np.ndarray, mask: np.ndarray, spacing: tuple, class_names: dict, out_dir: Path):
    log.info(f"build_atlas -> {out_dir}")
    log.kv("vol shape", vol.shape)
    log.kv("mask shape", mask.shape)

    for sub in ["axial", "sagittal", "coronal", "labels"]:
        p = out_dir / sub
        if p.exists():
            shutil.rmtree(p)
    log.debug("cleaned existing plane subdirs")

    # Build per-class binary masks (only classes present in volume)
    with Stage(log, "extract per-class binary masks"):
        merged = {}
        empty_classes = []
        for cid, cname in class_names.items():
            if cid == 0 or cname == "background":
                continue
            binary = (mask == cid).astype(np.uint8)
            voxels = int(binary.sum())
            if voxels == 0:
                empty_classes.append(cname)
                continue
            merged[cname] = binary
            log.debug(f"  class {cid:2d} {cname}: {voxels} voxels")
        log.info(f"active classes: {len(merged)} (empty: {len(empty_classes)})")
        if empty_classes:
            log.debug(f"  empty: {', '.join(empty_classes)}")

    planes = {
        "axial":    (2, vol.shape[2]),
        "sagittal": (1, vol.shape[1]),
        "coronal":  (0, vol.shape[0]),
    }

    structures = []
    struct_by_name = {}
    for idx, name in enumerate(sorted(merged.keys())):
        cat = get_category(name)
        color = CATEGORY_COLORS.get(cat, CATEGORY_COLORS["other"])
        s = {
            "id": idx,
            "name": name,
            "displayName": build_display_name(name),
            "category": cat,
            "color": color,
            "bestSlice": {},
            "sliceRange": {},
        }
        structures.append(s)
        struct_by_name[name] = s

    for plane_name, (axis, n_slices) in planes.items():
        with Stage(log, f"render {plane_name} ({n_slices} slices)"):
            img_dir = out_dir / plane_name
            label_dir = out_dir / "labels" / plane_name
            img_dir.mkdir(parents=True, exist_ok=True)
            label_dir.mkdir(parents=True, exist_ok=True)

            failed_slices = 0
            for si in range(n_slices):
                try:
                    if axis == 0:   vol_sl = vol[si, :, :]
                    elif axis == 1: vol_sl = vol[:, si, :]
                    else:           vol_sl = vol[:, :, si]

                    vol_disp = np.flipud(vol_sl.T)
                    mri_to_png_slice(vol_disp).save(img_dir / f"{si:04d}.png")

                    slice_labels = []
                    for name, seg_full in merged.items():
                        if axis == 0:   seg_sl = seg_full[si, :, :]
                        elif axis == 1: seg_sl = seg_full[:, si, :]
                        else:           seg_sl = seg_full[:, :, si]

                        if seg_sl.max() < 1:
                            continue

                        seg_disp = np.flipud(seg_sl.T)
                        contours = mask_to_contours(seg_disp)
                        if not contours:
                            continue

                        struct = struct_by_name[name]
                        slice_labels.append({"id": struct["id"], "name": name, "contours": contours})

                        r = struct["sliceRange"].setdefault(plane_name, [si, si])
                        r[0] = min(r[0], si)
                        r[1] = max(r[1], si)

                    with open(label_dir / f"{si:04d}.json", "w") as f:
                        json.dump(slice_labels, f)
                except Exception:
                    failed_slices += 1
                    log.error(f"  {plane_name} slice {si} failed", exc=True)

            for s in structures:
                r = s["sliceRange"].get(plane_name)
                s["bestSlice"][plane_name] = (r[0] + r[1]) // 2 if r else n_slices // 2

            if failed_slices:
                log.warn(f"  {plane_name}: {failed_slices}/{n_slices} slices failed")

    info = {
        "modality": "MRI",
        "planes": {p: {"slices": int(n)} for p, (_, n) in planes.items()},
        "window": {"center": 0, "width": 0},
        "voxelSpacing": [round(float(s), 2) for s in spacing],
    }
    with open(out_dir / "info.json", "w") as f:
        json.dump(info, f, indent=2)

    active = [s for s in structures if s.get("sliceRange")]
    with open(out_dir / "structures.json", "w", encoding="utf-8") as f:
        json.dump({"totalStructures": len(active), "structures": active},
                  f, ensure_ascii=False)

    log.ok(f"atlas complete: {len(active)} structures -> {out_dir}")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--case", type=str, default="1", help="SPIDER case ID")
    parser.add_argument("--out", type=Path, default=OUT_DIR)
    parser.add_argument("--checkpoint", type=Path, default=CHECKPOINT_MRI)
    args = parser.parse_args()

    log.banner("MRI atlas builder")
    log.kv("case", args.case)
    log.kv("output", args.out)
    log.kv("checkpoint", args.checkpoint)

    mha_path = SPIDER_BASE / "images" / f"{args.case}_t2.mha"
    if not mha_path.exists():
        log.fatal(f"MRI source missing: {mha_path}", exc=False)
        sys.exit(1)
    if not args.checkpoint.exists():
        log.fatal(f"checkpoint missing: {args.checkpoint}", exc=False)
        sys.exit(1)

    from inference.predictor import MRI26_NAMES

    with Stage(log, "1/3 load MRI volume"):
        vol, spacing, _ = load_mri_volume(mha_path)
        log.kv("volume shape", vol.shape)
        log.kv("voxel spacing", tuple(round(float(s), 3) for s in spacing))

    with Stage(log, "2/3 run inference"):
        mask = run_inference(vol, args.checkpoint)
        unique = np.unique(mask).tolist()
        log.kv("detected class IDs", unique)
        named = [MRI26_NAMES.get(c, f"?{c}") for c in unique if c != 0]
        log.kv("detected class names", named)

    with Stage(log, "3/3 build atlas"):
        build_atlas(vol, mask, spacing, MRI26_NAMES, args.out)

    log.banner("MRI atlas builder complete")


if __name__ == "__main__":
    main()
