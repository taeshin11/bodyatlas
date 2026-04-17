"""
Test MedSAM fine-tuned checkpoint vs SAM base on brain MRI parcellation.
Compares bbox-prompted segmentation quality against FastSurfer ground truth.
"""

import numpy as np
import nibabel as nib
from pathlib import Path
from PIL import Image
import torch
from segment_anything import sam_model_registry, SamPredictor

FASTSURFER_SEG = Path("D:/ImageLabelAPI_SPINAI/outputs/brain_atlas_test/fastsurfer_out/sub01/mri/aparc.DKTatlas+aseg.deep.mgz")
T1_ORIG = Path("D:/ImageLabelAPI_SPINAI/outputs/brain_atlas_test/fastsurfer_out/sub01/mri/orig.mgz")

# Two checkpoints to compare
SAM_BASE = Path("D:/ImageLabelAPI_SPINAI/outputs/medsam_vit_b.pth")  # SAM base (375042383)
MEDSAM_FT = Path("D:/ImageLabelAPI_SPINAI/outputs/MedSAM/work_dir/MedSAM/medsam_vit_b.pth")  # MedSAM fine-tuned (375049145)

FS_LABELS = {
    2: "L-Cerebral-WM", 8: "L-Cerebellum-Ctx", 10: "L-Thalamus",
    11: "L-Caudate", 12: "L-Putamen", 16: "Brain-Stem",
    17: "L-Hippocampus", 41: "R-Cerebral-WM",
    47: "R-Cerebellum-Ctx", 49: "R-Thalamus", 50: "R-Caudate",
    51: "R-Putamen", 53: "R-Hippocampus",
}


def dice(a, b):
    inter = np.sum(a * b)
    total = a.sum() + b.sum()
    return 2 * inter / total if total > 0 else 1.0


def get_bbox(mask, pad=5):
    ys, xs = np.where(mask > 0)
    if len(ys) == 0: return None
    h, w = mask.shape
    return np.array([
        max(0, xs.min() - pad), max(0, ys.min() - pad),
        min(w - 1, xs.max() + pad), min(h - 1, ys.max() + pad)
    ])


def main():
    device = torch.device("cuda")
    print(f"GPU: {torch.cuda.get_device_name(0)}, VRAM: {torch.cuda.mem_get_info()[0]//1024//1024}MB free")

    # Load brain data
    seg_data = np.asarray(nib.load(FASTSURFER_SEG).dataobj).astype(np.int32)
    t1_data = np.asarray(nib.load(T1_ORIG).dataobj).astype(np.float32)

    # Sagittal mid slice
    seg_sl = np.flipud(seg_data[128, :, :].T).astype(np.int32)
    t1_sl = np.flipud(t1_data[128, :, :].T).astype(np.float32)

    # MRI to RGB
    p1, p99 = np.percentile(t1_sl[t1_sl > 0], [1, 99])
    s = np.clip(t1_sl, p1, p99)
    s = ((s - p1) / (p99 - p1) * 255).astype(np.uint8)
    image_rgb = np.stack([s, s, s], axis=-1)

    # Collect test structures
    test = []
    for lid, name in FS_LABELS.items():
        mask = (seg_sl == lid).astype(np.uint8)
        if mask.sum() > 50:
            test.append((lid, name, mask))
    print(f"Testing {len(test)} structures\n")

    # Test both checkpoints
    for ckpt_name, ckpt_path in [("SAM-base", SAM_BASE), ("MedSAM-ft", MEDSAM_FT)]:
        print(f"=== {ckpt_name} ({ckpt_path.name}, {ckpt_path.stat().st_size} bytes) ===")
        model = sam_model_registry["vit_b"](checkpoint=str(ckpt_path))
        model.to(device).eval()
        predictor = SamPredictor(model)

        dices = []
        print(f"{'Structure':25s} {'FS':>6s} {'SAM':>6s} {'Dice':>6s}")
        for lid, name, fs_mask in test:
            bbox = get_bbox(fs_mask, pad=5)
            if bbox is None: continue

            predictor.set_image(image_rgb)
            masks, scores, _ = predictor.predict(
                point_coords=None, point_labels=None,
                box=bbox[None, :], multimask_output=True,
            )
            sam_mask = masks[np.argmax(scores)].astype(np.uint8)
            d = dice(fs_mask, sam_mask)
            dices.append(d)
            print(f"{name:25s} {fs_mask.sum():6d} {sam_mask.sum():6d} {d:6.3f}")

        print(f"Average Dice: {np.mean(dices):.3f}\n")

        # Free GPU memory
        del model, predictor
        torch.cuda.empty_cache()


if __name__ == "__main__":
    main()
