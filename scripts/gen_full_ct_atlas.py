"""
gen_full_ct_atlas.py

Rebuilds the full-body CT atlas (chest-ct) using merged TotalSegmentator v2
+ VISTA3D segmentations for improved quality and coverage.

Unlike gen_head_ct_atlas.py, no Z-axis cropping is applied — all 431 slices.

Usage
-----
    python scripts/gen_full_ct_atlas.py
    python scripts/gen_full_ct_atlas.py --seg-dir data_pipeline/chest_ct_seg

Requirements
------------
    pip install nibabel scikit-image scipy Pillow numpy
"""

import argparse
import json
import sys
from pathlib import Path

import numpy as np

# ── Paths ────────────────────────────────────────────────────────────────────
PROJECT_ROOT = Path(__file__).parent.parent
SEG_DIR      = PROJECT_ROOT / "data_pipeline/head_ct_seg"          # same source CT segs
VISTA_SEG    = PROJECT_ROOT / "data_pipeline/vista3d_seg"
OUT_DIR      = PROJECT_ROOT / "public/data/chest-ct"

CT_PATH = Path("D:/ImageLabelAPI_SPINAI/data/cat_F_opensource/TotalSegmentator_v2/s0011/ct.nii.gz")

WINDOW_CENTER = 40
WINDOW_WIDTH  = 400     # wide window for chest CT

CATEGORY_COLORS = {
    "bone":   "#F59E0B",
    "organ":  "#EF4444",
    "vessel": "#3B82F6",
    "muscle": "#10B981",
    "cavity": "#8B5CF6",
    "gland":  "#F97316",
    "nerve":  "#EC4899",
    "brain":  "#6366F1",
    "other":  "#94A3B8",
}

sys.path.insert(0, str(PROJECT_ROOT / "scripts"))
from gen_head_ct_atlas import (
    get_category, mask_to_contours, build_display_name, CATEGORY_COLORS
)


def merge_all_segs(seg_dir: Path, vista_dir: Path) -> dict:
    """Merge TotalSegmentator task dirs + VISTA3D flat dir.

    Returns {name: (array, affine)}.
    """
    import nibabel as nib

    merged = {}

    # TotalSegmentator task subdirs
    for task_dir in seg_dir.iterdir():
        if not task_dir.is_dir(): continue
        for f in task_dir.glob("*.nii.gz"):
            name = f.stem.replace(".nii", "")
            if name in merged: continue
            img = nib.load(f)
            data = img.get_fdata(dtype=np.float32)
            if data.max() > 0:
                merged[name] = (data, img.affine)

    # VISTA3D flat dir (add new or prefer if same name)
    for f in vista_dir.glob("*.nii.gz"):
        name = f.stem.replace(".nii", "")
        img  = nib.load(f)
        data = img.get_fdata(dtype=np.float32)
        if data.max() > 0:
            # Prefer VISTA3D for structures it detected (newer model)
            merged[name] = (data, img.affine)

    print(f"Merged {len(merged)} structures total")
    return merged


def ct_to_png_slice(ct_slice: np.ndarray, wc: int, ww: int):
    from PIL import Image
    lo  = wc - ww / 2
    hi  = wc + ww / 2
    arr = np.clip(ct_slice, lo, hi)
    arr = ((arr - lo) / (hi - lo) * 255).astype(np.uint8)
    return Image.fromarray(arr)


def build_atlas(ct_path: Path, merged: dict, out_dir: Path):
    import nibabel as nib

    print(f"\nBuilding full-CT atlas -> {out_dir}")
    ct_img  = nib.load(ct_path)
    ct_data = ct_img.get_fdata(dtype=np.float32)
    print(f"CT shape: {ct_data.shape}")

    planes = {
        "axial":    (2, ct_data.shape[2]),
        "sagittal": (0, ct_data.shape[0]),
        "coronal":  (1, ct_data.shape[1]),
    }

    structures = []
    struct_by_name = {}
    for idx, name in enumerate(sorted(merged.keys())):
        cat   = get_category(name)
        color = CATEGORY_COLORS.get(cat, CATEGORY_COLORS["other"])
        s = {
            "id": idx, "name": name,
            "displayName": build_display_name(name),
            "category": cat, "color": color,
            "bestSlice": {}, "sliceRange": {},
        }
        structures.append(s)
        struct_by_name[name] = s

    for plane_name, (axis, n_slices) in planes.items():
        img_dir   = out_dir / plane_name
        label_dir = out_dir / "labels" / plane_name
        img_dir.mkdir(parents=True, exist_ok=True)
        label_dir.mkdir(parents=True, exist_ok=True)
        print(f"  {plane_name}: {n_slices} slices...")

        for si in range(n_slices):
            if axis == 0:   ct_sl = ct_data[si, :, :]
            elif axis == 1: ct_sl = ct_data[:, si, :]
            else:           ct_sl = ct_data[:, :, si]

            ct_to_png_slice(ct_sl, WINDOW_CENTER, WINDOW_WIDTH).save(
                img_dir / f"{si:04d}.png"
            )

            slice_labels = []
            for name, (seg_full, _) in merged.items():
                if axis == 0:   seg_sl = seg_full[si, :, :]
                elif axis == 1: seg_sl = seg_full[:, si, :]
                else:           seg_sl = seg_full[:, :, si]

                if seg_sl.max() < 0.5: continue

                if axis == 0:   seg_sl = np.fliplr(seg_sl)
                elif axis == 1: seg_sl = np.flipud(seg_sl)

                contours = mask_to_contours(seg_sl)
                if not contours: continue

                struct = struct_by_name[name]
                slice_labels.append({"id": struct["id"], "name": name, "contours": contours})

                r = struct["sliceRange"].setdefault(plane_name, [si, si])
                r[0] = min(r[0], si)
                r[1] = max(r[1], si)

            with open(label_dir / f"{si:04d}.json", "w") as f:
                json.dump(slice_labels, f)

        for s in structures:
            r = s["sliceRange"].get(plane_name)
            s["bestSlice"][plane_name] = (r[0] + r[1]) // 2 if r else n_slices // 2

        print(f"    Done")

    info = {
        "planes": {p: {"slices": int(n)} for p, (_, n) in planes.items()},
        "window": {"center": WINDOW_CENTER, "width": WINDOW_WIDTH},
        "voxelSpacing": [1.5, 1.5, 1.5],
    }
    with open(out_dir / "info.json", "w") as f:
        json.dump(info, f, indent=2)

    active = [s for s in structures if s.get("sliceRange")]
    with open(out_dir / "structures.json", "w", encoding="utf-8") as f:
        json.dump({"totalStructures": len(active), "structures": active},
                  f, ensure_ascii=False)

    print(f"\nAtlas complete: {len(active)} structures -> {out_dir}")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--ct",       type=Path, default=CT_PATH)
    parser.add_argument("--seg-dir",  type=Path, default=SEG_DIR)
    parser.add_argument("--vista-dir",type=Path, default=VISTA_SEG)
    parser.add_argument("--out",      type=Path, default=OUT_DIR)
    args = parser.parse_args()

    merged = merge_all_segs(args.seg_dir, args.vista_dir)
    build_atlas(args.ct, merged, args.out)
    print("\nDone. npm run dev to verify.")


if __name__ == "__main__":
    main()
