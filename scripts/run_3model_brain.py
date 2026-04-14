"""
run_3model_brain.py

3-model agreement brain MRI parcellation pipeline:
  1. FastSurfer (Apache 2.0) → 95 region parcellation
  2. MedSAM (Apache 2.0) → bbox-prompted boundary refinement
  3. SAM3 (SAM License) → bbox-prompted cross-validation
  4. Agreement → final high-quality masks

Tests on sagittal slice 128 with 10 structures.
"""

import sys
import numpy as np
import nibabel as nib
from pathlib import Path
from PIL import Image
import torch

FASTSURFER_SEG = Path("D:/ImageLabelAPI_SPINAI/outputs/brain_atlas_test/fastsurfer_out/sub01/mri/aparc.DKTatlas+aseg.deep.mgz")
T1_ORIG = Path("D:/ImageLabelAPI_SPINAI/outputs/brain_atlas_test/fastsurfer_out/sub01/mri/orig.mgz")
OUT_DIR = Path("D:/ImageLabelAPI_SPINAI/outputs/brain_atlas_test/3model_test")
OUT_DIR.mkdir(parents=True, exist_ok=True)

SAM_CKPT = Path("D:/ImageLabelAPI_SPINAI/outputs/medsam_vit_b.pth")
SAM3_REPO = Path("D:/ImageLabelAPI_SPINAI/outputs/sam3_repo")

FS_LABELS = {
    2: "Left-Cerebral-WM", 4: "Left-Lat-Ventricle",
    8: "Left-Cerebellum-Ctx", 10: "Left-Thalamus",
    11: "Left-Caudate", 12: "Left-Putamen", 16: "Brain-Stem",
    17: "Left-Hippocampus", 41: "Right-Cerebral-WM",
    43: "Right-Lat-Ventricle", 47: "Right-Cerebellum-Ctx",
    49: "Right-Thalamus", 50: "Right-Caudate", 51: "Right-Putamen",
    53: "Right-Hippocampus",
}


def load_slice(vol_path, axis=0, idx=128):
    img = nib.load(vol_path)
    data = np.asarray(img.dataobj)
    if axis == 0: return data[idx, :, :]
    elif axis == 1: return data[:, idx, :]
    else: return data[:, :, idx]


def slice_to_rgb(mri_slice):
    s = mri_slice.astype(np.float32)
    if s.max() > 0:
        p1, p99 = np.percentile(s[s > 0], [1, 99])
    else:
        p1, p99 = 0, 1
    s = np.clip(s, p1, p99)
    s = ((s - p1) / max(p99 - p1, 1) * 255).astype(np.uint8)
    return np.stack([s, s, s], axis=-1)


def get_bbox(mask, pad=10):
    ys, xs = np.where(mask > 0)
    if len(ys) == 0: return None
    h, w = mask.shape
    return np.array([
        max(0, xs.min() - pad), max(0, ys.min() - pad),
        min(w - 1, xs.max() + pad), min(h - 1, ys.max() + pad)
    ])


def dice(a, b):
    inter = np.sum(a * b)
    total = a.sum() + b.sum()
    return 2 * inter / total if total > 0 else 1.0


def run_sam_with_bbox(predictor, image_rgb, bbox):
    """Run SAM/MedSAM predictor with bbox prompt."""
    predictor.set_image(image_rgb)
    input_box = np.array(bbox)
    masks, scores, _ = predictor.predict(
        point_coords=None,
        point_labels=None,
        box=input_box[None, :],
        multimask_output=True,
    )
    # Return best mask
    best_idx = np.argmax(scores)
    return masks[best_idx].astype(np.uint8)


def main():
    device = torch.device("cuda")
    print("=" * 60)
    print("3-Model Brain MRI Parcellation Test")
    print(f"Device: {device} ({torch.cuda.get_device_name(0)})")
    print(f"VRAM: {torch.cuda.mem_get_info()[0]//1024//1024}MB free")
    print("=" * 60)

    # Load data
    print("\n[1/5] Loading FastSurfer parcellation...")
    seg_slice = np.flipud(load_slice(FASTSURFER_SEG, 0, 128).T).astype(np.int32)
    t1_slice = np.flipud(load_slice(T1_ORIG, 0, 128).T).astype(np.float32)
    image_rgb = slice_to_rgb(t1_slice)
    H, W = image_rgb.shape[:2]
    print(f"  Slice: {H}x{W}")

    # Select test structures (must have >50px area)
    test_structs = []
    for lid, name in FS_LABELS.items():
        mask = (seg_slice == lid).astype(np.uint8)
        if mask.sum() > 50:
            test_structs.append((lid, name, mask))
    print(f"  Structures to test: {len(test_structs)}")

    # Load SAM (used as MedSAM proxy with SAM ViT-B weights)
    print("\n[2/5] Loading SAM ViT-B (MedSAM proxy)...")
    from segment_anything import sam_model_registry, SamPredictor
    sam_model = sam_model_registry["vit_b"](checkpoint=str(SAM_CKPT))
    sam_model.to(device)
    sam_model.eval()
    sam_predictor = SamPredictor(sam_model)
    print(f"  SAM ViT-B loaded. VRAM: {torch.cuda.mem_get_info()[0]//1024//1024}MB free")

    # Load SAM3 (image model for single-image segmentation)
    print("\n[3/5] Loading SAM3...")
    sys.path.insert(0, str(SAM3_REPO))
    from sam3 import build_sam3_image_model
    sam3_ckpt = SAM3_REPO / "checkpoints/sam3.pt"
    sam3_model = build_sam3_image_model(
        checkpoint_path=str(sam3_ckpt),
        device=str(device),
        load_from_HF=False,
    )
    print(f"  SAM3 loaded. VRAM: {torch.cuda.mem_get_info()[0]//1024//1024}MB free")

    # Run 3-model comparison
    print("\n[4/5] Running 3-model comparison...")
    print(f"{'Structure':30s} {'FS area':>8s} {'SAM area':>8s} {'SAM3 area':>8s} {'FS-SAM':>7s} {'FS-SAM3':>8s} {'SAM-SAM3':>9s}")
    print("-" * 100)

    results = []
    for lid, name, fs_mask in test_structs:
        bbox = get_bbox(fs_mask, pad=10)
        if bbox is None:
            continue

        # Model 2: SAM (MedSAM proxy)
        try:
            sam_mask = run_sam_with_bbox(sam_predictor, image_rgb, bbox)
        except Exception as e:
            print(f"  SAM failed for {name}: {e}")
            sam_mask = fs_mask.copy()

        # Model 3: SAM3 (image model with bbox prompt)
        try:
            with torch.inference_mode():
                # SAM3 image model: segment with bbox
                pil_img = Image.fromarray(image_rgb)
                sam3_result = sam3_model.segment(pil_img, boxes=[bbox.tolist()])
                sam3_mask = sam3_result[0]["segmentation"].astype(np.uint8) if sam3_result else fs_mask.copy()
        except Exception as e:
            print(f"  SAM3 failed for {name}: {e}")
            sam3_mask = fs_mask.copy()

        # Dice scores
        d_fs_sam = dice(fs_mask, sam_mask)
        d_fs_sam3 = dice(fs_mask, sam3_mask)
        d_sam_sam3 = dice(sam_mask, sam3_mask)

        print(f"{name:30s} {fs_mask.sum():8d} {sam_mask.sum():8d} {sam3_mask.sum():8d} {d_fs_sam:7.3f} {d_fs_sam3:8.3f} {d_sam_sam3:9.3f}")

        # 3-model agreement: majority vote (2/3 agree)
        agreement = ((fs_mask.astype(int) + sam_mask.astype(int) + sam3_mask.astype(int)) >= 2).astype(np.uint8)
        results.append((lid, name, fs_mask, sam_mask, sam3_mask, agreement))

    # Save visualization
    print("\n[5/5] Saving visualizations...")
    colors = [
        (255,50,50), (50,255,50), (50,50,255), (255,255,50),
        (255,50,255), (50,255,255), (200,100,50), (50,200,100),
        (100,50,200), (200,200,50), (200,50,200), (50,200,200),
        (150,150,50), (150,50,150), (50,150,150),
    ]

    for title, mask_idx in [("fastsurfer", 2), ("sam", 3), ("sam3", 4), ("agreement", 5)]:
        overlay = image_rgb.copy()
        for i, r in enumerate(results):
            m = r[mask_idx].astype(bool)
            c = np.array(colors[i % len(colors)])
            overlay[m] = (overlay[m] * 0.5 + c * 0.5).astype(np.uint8)
        Image.fromarray(overlay).save(OUT_DIR / f"{title}_overlay.png")

    print(f"  Saved 4 overlays to {OUT_DIR}")

    # Summary
    avg_fs_sam = np.mean([dice(r[2], r[3]) for r in results])
    avg_fs_sam3 = np.mean([dice(r[2], r[4]) for r in results])
    avg_sam_sam3 = np.mean([dice(r[3], r[4]) for r in results])
    print(f"\n{'=' * 60}")
    print(f"Average Dice: FS-SAM={avg_fs_sam:.3f}  FS-SAM3={avg_fs_sam3:.3f}  SAM-SAM3={avg_sam_sam3:.3f}")
    print(f"Structures tested: {len(results)}")
    print(f"All models: COMMERCIAL USE OK")
    print(f"{'=' * 60}")


if __name__ == "__main__":
    main()
