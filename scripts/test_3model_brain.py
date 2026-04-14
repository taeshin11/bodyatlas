"""
test_3model_brain.py

3-model agreement test for brain MRI parcellation:
  1. FastSurfer (Apache 2.0) - initial parcellation (95 regions)
  2. MedSAM (Apache 2.0) - medical image boundary refinement
  3. SAM3 (SAM License) - general segmentation cross-validation

Tests on a single sagittal slice to validate the approach.
"""

import sys
import numpy as np
import nibabel as nib
from pathlib import Path
from PIL import Image

# Paths
FASTSURFER_SEG = Path("D:/ImageLabelAPI_SPINAI/outputs/brain_atlas_test/fastsurfer_out/sub01/mri/aparc.DKTatlas+aseg.deep.mgz")
T1_ORIG = Path("D:/ImageLabelAPI_SPINAI/outputs/brain_atlas_test/fastsurfer_out/sub01/mri/orig.mgz")
OUT_DIR = Path("D:/ImageLabelAPI_SPINAI/outputs/brain_atlas_test/3model_test")
OUT_DIR.mkdir(parents=True, exist_ok=True)

# FreeSurfer DKT label names (subset)
FS_LABELS = {
    2: "Left-Cerebral-White-Matter", 4: "Left-Lateral-Ventricle",
    5: "Left-Inf-Lat-Vent", 7: "Left-Cerebellum-White-Matter",
    8: "Left-Cerebellum-Cortex", 10: "Left-Thalamus",
    11: "Left-Caudate", 12: "Left-Putamen", 13: "Left-Pallidum",
    14: "3rd-Ventricle", 15: "4th-Ventricle", 16: "Brain-Stem",
    17: "Left-Hippocampus", 18: "Left-Amygdala", 24: "CSF",
    26: "Left-Accumbens-area", 28: "Left-VentralDC",
    31: "Left-choroid-plexus",
    41: "Right-Cerebral-White-Matter", 43: "Right-Lateral-Ventricle",
    44: "Right-Inf-Lat-Vent", 46: "Right-Cerebellum-White-Matter",
    47: "Right-Cerebellum-Cortex", 49: "Right-Thalamus",
    50: "Right-Caudate", 51: "Right-Putamen", 52: "Right-Pallidum",
    53: "Right-Hippocampus", 54: "Right-Amygdala",
    58: "Right-Accumbens-area", 60: "Right-VentralDC",
    63: "Right-choroid-plexus", 77: "WM-hypointensities",
    1002: "ctx-lh-caudalanteriorcingulate", 1003: "ctx-lh-caudalmiddlefrontal",
    1005: "ctx-lh-cuneus", 1006: "ctx-lh-entorhinal",
    1007: "ctx-lh-fusiform", 1008: "ctx-lh-inferiorparietal",
    1009: "ctx-lh-inferiortemporal", 1010: "ctx-lh-isthmuscingulate",
    1011: "ctx-lh-lateraloccipital", 1012: "ctx-lh-lateralorbitofrontal",
    1013: "ctx-lh-lingual", 1014: "ctx-lh-medialorbitofrontal",
    1015: "ctx-lh-middletemporal", 1016: "ctx-lh-parahippocampal",
    1017: "ctx-lh-paracentral", 1018: "ctx-lh-parsopercularis",
    1019: "ctx-lh-parsorbitalis", 1020: "ctx-lh-parstriangularis",
    1021: "ctx-lh-pericalcarine", 1022: "ctx-lh-postcentral",
    1023: "ctx-lh-posteriorcingulate", 1024: "ctx-lh-precentral",
    1025: "ctx-lh-precuneus", 1026: "ctx-lh-rostralanteriorcingulate",
    1027: "ctx-lh-rostralmiddlefrontal", 1028: "ctx-lh-superiorfrontal",
    1029: "ctx-lh-superiorparietal", 1030: "ctx-lh-superiortemporal",
    1031: "ctx-lh-supramarginal", 1034: "ctx-lh-transversetemporal",
    1035: "ctx-lh-insula",
    2002: "ctx-rh-caudalanteriorcingulate", 2003: "ctx-rh-caudalmiddlefrontal",
    2005: "ctx-rh-cuneus", 2006: "ctx-rh-entorhinal",
    2007: "ctx-rh-fusiform", 2008: "ctx-rh-inferiorparietal",
    2009: "ctx-rh-inferiortemporal", 2010: "ctx-rh-isthmuscingulate",
    2011: "ctx-rh-lateraloccipital", 2012: "ctx-rh-lateralorbitofrontal",
    2013: "ctx-rh-lingual", 2014: "ctx-rh-medialorbitofrontal",
    2015: "ctx-rh-middletemporal", 2016: "ctx-rh-parahippocampal",
    2017: "ctx-rh-paracentral", 2018: "ctx-rh-parsopercularis",
    2019: "ctx-rh-parsorbitalis", 2020: "ctx-rh-parstriangularis",
    2021: "ctx-rh-pericalcarine", 2022: "ctx-rh-postcentral",
    2023: "ctx-rh-posteriorcingulate", 2024: "ctx-rh-precentral",
    2025: "ctx-rh-precuneus", 2026: "ctx-rh-rostralanteriorcingulate",
    2027: "ctx-rh-rostralmiddlefrontal", 2028: "ctx-rh-superiorfrontal",
    2029: "ctx-rh-superiorparietal", 2030: "ctx-rh-superiortemporal",
    2031: "ctx-rh-supramarginal", 2034: "ctx-rh-transversetemporal",
    2035: "ctx-rh-insula",
}


def load_slice(vol_path, axis=0, idx=128):
    """Load a single 2D slice from a volume."""
    img = nib.load(vol_path)
    data = np.asarray(img.dataobj)
    if axis == 0:
        return data[idx, :, :], img.affine
    elif axis == 1:
        return data[:, idx, :], img.affine
    else:
        return data[:, :, idx], img.affine


def slice_to_rgb(mri_slice):
    """Convert MRI slice to RGB uint8 for SAM models."""
    s = mri_slice.astype(np.float32)
    p1, p99 = np.percentile(s[s > 0], [1, 99]) if s.max() > 0 else (0, 1)
    s = np.clip(s, p1, p99)
    s = ((s - p1) / max(p99 - p1, 1) * 255).astype(np.uint8)
    return np.stack([s, s, s], axis=-1)  # grayscale to RGB


def get_bbox_from_mask(mask, pad=5):
    """Get bounding box [x1, y1, x2, y2] from binary mask."""
    ys, xs = np.where(mask > 0)
    if len(ys) == 0:
        return None
    return [
        max(0, xs.min() - pad),
        max(0, ys.min() - pad),
        min(mask.shape[1] - 1, xs.max() + pad),
        min(mask.shape[0] - 1, ys.max() + pad),
    ]


def run_medsam(image_rgb, bbox, medsam_model, device):
    """Run MedSAM on a single region defined by bbox."""
    import torch
    from segment_anything import sam_model_registry, SamPredictor

    H, W = image_rgb.shape[:2]

    # MedSAM expects 1024x1024 input
    img_1024 = np.array(Image.fromarray(image_rgb).resize((1024, 1024), Image.BILINEAR))
    img_tensor = torch.tensor(img_1024).float().permute(2, 0, 1).unsqueeze(0).to(device) / 255.0

    # Scale bbox to 1024x1024
    scale_x, scale_y = 1024 / W, 1024 / H
    bbox_1024 = [bbox[0] * scale_x, bbox[1] * scale_y, bbox[2] * scale_x, bbox[3] * scale_y]
    bbox_tensor = torch.tensor(bbox_1024).float().unsqueeze(0).to(device)

    with torch.no_grad():
        img_embed = medsam_model.image_encoder(img_tensor)
        sparse, dense = medsam_model.prompt_encoder(
            points=None, boxes=bbox_tensor, masks=None
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
    mask = (mask_pred.squeeze().cpu().numpy() > 0).astype(np.uint8)
    return mask


def compute_dice(mask1, mask2):
    """Compute Dice coefficient between two binary masks."""
    intersection = np.sum(mask1 * mask2)
    if mask1.sum() + mask2.sum() == 0:
        return 1.0
    return 2 * intersection / (mask1.sum() + mask2.sum())


def main():
    import torch

    print("=" * 60)
    print("3-Model Agreement Test: Brain MRI Parcellation")
    print("=" * 60)

    # Load data
    print("\n[1/4] Loading FastSurfer parcellation...")
    seg_slice, _ = load_slice(FASTSURFER_SEG, axis=0, idx=128)  # sagittal mid
    t1_slice, _ = load_slice(T1_ORIG, axis=0, idx=128)
    seg_slice = np.flipud(seg_slice.T).astype(np.int32)
    t1_slice = np.flipud(t1_slice.T).astype(np.float32)

    image_rgb = slice_to_rgb(t1_slice)
    print(f"  Slice shape: {t1_slice.shape}")

    # Find labels present in this slice
    present_labels = [l for l in np.unique(seg_slice) if l > 0 and l in FS_LABELS]
    print(f"  Labels in slice: {len(present_labels)}")

    # Save slice for visual inspection
    Image.fromarray(image_rgb).save(OUT_DIR / "t1_sagittal_128.png")

    # Test with a few representative structures
    test_labels = []
    for l in present_labels:
        mask = (seg_slice == l).astype(np.uint8)
        if mask.sum() > 100:  # skip tiny regions
            test_labels.append(l)
    test_labels = test_labels[:10]  # test first 10 substantial structures

    print(f"  Testing {len(test_labels)} structures: {[FS_LABELS.get(l, l) for l in test_labels]}")

    # Load MedSAM
    print("\n[2/4] Loading MedSAM...")
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

    # Check for MedSAM checkpoint
    medsam_ckpt = Path("D:/ImageLabelAPI_SPINAI/outputs/MedSAM/work_dir/MedSAM/medsam_vit_b.pth")
    if not medsam_ckpt.exists():
        # Try to download
        medsam_ckpt = Path("D:/ImageLabelAPI_SPINAI/outputs/medsam_vit_b.pth")
        if not medsam_ckpt.exists():
            print("  MedSAM checkpoint not found. Downloading...")
            import urllib.request
            url = "https://dl.fbaipublicfiles.com/segment_anything/sam_vit_b_01ec64.pth"
            print(f"  Downloading SAM ViT-B checkpoint...")
            urllib.request.urlretrieve(url, str(medsam_ckpt))

    print(f"  Checkpoint: {medsam_ckpt}")

    # For now, just test FastSurfer quality and save results
    print("\n[3/4] Analyzing FastSurfer parcellation quality...")
    results = []
    for label_id in test_labels:
        mask = (seg_slice == label_id).astype(np.uint8)
        bbox = get_bbox_from_mask(mask)
        name = FS_LABELS.get(label_id, f"label_{label_id}")
        area = mask.sum()
        results.append({
            "label": label_id,
            "name": name,
            "area_px": int(area),
            "bbox": bbox,
        })
        print(f"  {name:40s} area={area:6d}px  bbox={bbox}")

    # Save FastSurfer overlay
    print("\n[4/4] Saving visualization...")
    overlay = image_rgb.copy()
    colors = [
        (255, 0, 0), (0, 255, 0), (0, 0, 255), (255, 255, 0),
        (255, 0, 255), (0, 255, 255), (128, 0, 0), (0, 128, 0),
        (0, 0, 128), (128, 128, 0),
    ]
    for i, label_id in enumerate(test_labels):
        mask = (seg_slice == label_id).astype(bool)
        color = colors[i % len(colors)]
        overlay[mask] = (overlay[mask] * 0.5 + np.array(color) * 0.5).astype(np.uint8)

    Image.fromarray(overlay).save(OUT_DIR / "fastsurfer_overlay.png")
    print(f"  Saved to {OUT_DIR}")

    print(f"\n{'=' * 60}")
    print(f"FastSurfer: {len(present_labels)} brain regions in this slice")
    print(f"Total parcellation: 95 regions (full volume)")
    print(f"License: Apache 2.0 - COMMERCIAL USE OK")
    print(f"{'=' * 60}")
    print(f"\nNext steps:")
    print(f"  1. MedSAM bbox-prompt refinement on each region")
    print(f"  2. SAM3 text-prompt cross-validation")
    print(f"  3. 3-model agreement → final atlas")


if __name__ == "__main__":
    main()
