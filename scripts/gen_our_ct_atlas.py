"""
gen_our_ct_atlas.py

Generates a "SPINAI CT" atlas from a TotalSegmentator_v2 case directly,
reading the per-structure .nii.gz files that ship with the dataset.

Output goes to public/data/our-ct/ so it can be compared side-by-side
with the existing chest-ct atlas.

Usage
-----
    python scripts/gen_our_ct_atlas.py
    python scripts/gen_our_ct_atlas.py --case s0174
"""

import argparse
import json
import shutil
import sys
from pathlib import Path

import numpy as np

PROJECT_ROOT = Path(__file__).parent.parent
TS_BASE = Path("D:/ImageLabelAPI_SPINAI/data/cat_F_opensource/TotalSegmentator_v2")

WINDOW_CENTER = 40
WINDOW_WIDTH  = 400

sys.path.insert(0, str(PROJECT_ROOT / "scripts"))
from gen_head_ct_atlas import (
    get_category, mask_to_contours, build_display_name, CATEGORY_COLORS
)


def load_segs_from_ts(case_dir: Path) -> dict:
    """Load all segmentations from a TotalSegmentator_v2 case directory."""
    import nibabel as nib

    seg_dir = case_dir / "segmentations"
    if not seg_dir.exists():
        raise FileNotFoundError(f"No segmentations dir in {case_dir}")

    merged = {}
    for f in sorted(seg_dir.glob("*.nii.gz")):
        name = f.stem.replace(".nii", "")
        img = nib.load(f)
        data = img.get_fdata(dtype=np.float32)
        if data.max() > 0:
            merged[name] = (data, img.affine)

    print(f"Loaded {len(merged)} structures from {case_dir.name}")
    return merged


def ct_to_png_slice(ct_slice: np.ndarray, wc: int, ww: int):
    from PIL import Image
    lo = wc - ww / 2
    hi = wc + ww / 2
    arr = np.clip(ct_slice, lo, hi)
    arr = ((arr - lo) / (hi - lo) * 255).astype(np.uint8)
    return Image.fromarray(arr)


def build_atlas(ct_path: Path, merged: dict, out_dir: Path):
    import nibabel as nib

    print(f"\nBuilding atlas -> {out_dir}")
    for sub in ["axial", "sagittal", "coronal", "labels"]:
        p = out_dir / sub
        if p.exists():
            shutil.rmtree(p)

    ct_img  = nib.load(ct_path)
    ct_data = ct_img.get_fdata(dtype=np.float32)
    spacing = ct_img.header.get_zooms()
    print(f"CT shape: {ct_data.shape}, spacing: {spacing}")

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

            ct_disp = np.flipud(ct_sl.T)
            ct_to_png_slice(ct_disp, WINDOW_CENTER, WINDOW_WIDTH).save(
                img_dir / f"{si:04d}.png"
            )

            slice_labels = []
            for name, (seg_full, _) in merged.items():
                if axis == 0:   seg_sl = seg_full[si, :, :]
                elif axis == 1: seg_sl = seg_full[:, si, :]
                else:           seg_sl = seg_full[:, :, si]

                if seg_sl.max() < 0.5:
                    continue

                seg_sl = np.flipud(seg_sl.T)
                contours = mask_to_contours(seg_sl)
                if not contours:
                    continue

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
        "voxelSpacing": [round(float(s), 2) for s in spacing],
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
    parser.add_argument("--case", type=str, default="s0174",
                        help="TotalSegmentator_v2 case ID")
    parser.add_argument("--out", type=Path,
                        default=PROJECT_ROOT / "public/data/our-ct")
    args = parser.parse_args()

    case_dir = TS_BASE / args.case
    ct_path  = case_dir / "ct.nii.gz"

    if not ct_path.exists():
        print(f"CT not found: {ct_path}")
        return

    merged = load_segs_from_ts(case_dir)
    build_atlas(ct_path, merged, args.out)
    print("\nDone. npm run dev to verify.")


if __name__ == "__main__":
    main()
