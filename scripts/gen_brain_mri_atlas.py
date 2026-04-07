"""
gen_brain_mri_atlas.py

Rebuilds the brain-mri atlas using OpenMAP-T1 Level5 parcellation output.
Produces 275 brain structures with contour overlays.

Usage
-----
    python scripts/gen_brain_mri_atlas.py
    python scripts/gen_brain_mri_atlas.py --parc path/to/Level5.nii --t1 path/to/t1.nii

Requirements
------------
    pip install nibabel scikit-image scipy Pillow numpy
"""

import argparse
import json
import sys
from pathlib import Path

import numpy as np

PROJECT_ROOT = Path(__file__).parent.parent
PARC_NII  = PROJECT_ROOT / "data_pipeline/openmap_output/t1/parcellated/t1_Type1_Level5.nii"
T1_NII    = PROJECT_ROOT / "data_pipeline/openmap_output/t1/original/t1.nii"
LABEL_CSV = PROJECT_ROOT / "data_pipeline/openmap_t1/level/OpenMAP-T1_multilevel_lookup_table_dictionary.csv"
OUT_DIR   = PROJECT_ROOT / "public/data/brain-mri"

WINDOW_CENTER = 140
WINDOW_WIDTH  = 220    # T1 MRI: values 0-255, p5≈107 p95≈225 → range 30-250 (better contrast)

CATEGORY_COLORS = {
    "frontal":   "#EF4444",
    "parietal":  "#F97316",
    "temporal":  "#F59E0B",
    "occipital": "#EAB308",
    "limbic":    "#84CC16",
    "subcortical": "#10B981",
    "cerebellum": "#06B6D4",
    "brainstem": "#3B82F6",
    "white":     "#8B5CF6",
    "ventricle": "#EC4899",
    "other":     "#94A3B8",
}


def get_category(label: str, region: str) -> str:
    r = region.lower()
    l = label.lower()
    if any(k in r for k in ["frontal", "sfg", "mfg", "ifg", "orbital"]):
        return "frontal"
    if any(k in r for k in ["parietal", "spl", "ipl", "ang", "supramarginal"]):
        return "parietal"
    if any(k in r for k in ["temporal", "stg", "mtg", "itg", "fusiform", "parahippocampal", "hippocampal"]):
        return "temporal"
    if any(k in r for k in ["occipital", "lingual", "cuneus", "calcarine"]):
        return "occipital"
    if any(k in r for k in ["cingulate", "insula", "amygdala", "hippocampus", "parahippocampal", "entorhinal"]):
        return "limbic"
    if any(k in r for k in ["thalamus", "caudate", "putamen", "pallidum", "accumbens", "basal ganglia", "subthalamic"]):
        return "subcortical"
    if any(k in r for k in ["cerebell", "vermis"]):
        return "cerebellum"
    if any(k in r for k in ["brainstem", "pons", "medulla", "midbrain", "brain stem"]):
        return "brainstem"
    if any(k in r for k in ["white matter", "corpus callosum", "corona radiata", "internal capsule", "external capsule", "fornix"]):
        return "white"
    if any(k in r for k in ["ventricle", "csf"]):
        return "ventricle"
    return "other"


def load_label_map(csv_path: Path) -> dict:
    """Returns {roi_num: (label, region)} from CSV."""
    labels = {}
    with open(csv_path, encoding="utf-8") as f:
        next(f)  # skip header
        for line in f:
            line = line.strip()
            if not line:
                continue
            parts = line.split(",", 2)
            if len(parts) < 3:
                continue
            roi, label, region = int(parts[0]), parts[1].strip(), parts[2].strip()
            labels[roi] = (label, region)
    return labels


def mask_to_contours(mask_2d: np.ndarray) -> list:
    from skimage import measure
    from scipy.ndimage import binary_fill_holes, binary_closing
    binary = mask_2d > 0.5
    binary = binary_fill_holes(binary)
    binary = binary_closing(binary, iterations=1)
    contours = measure.find_contours(binary.astype(np.float32), 0.5)
    result = []
    for c in contours:
        if len(c) < 6:
            continue
        pts_x = c[:, 1]
        pts_y = c[:, 0]
        if len(c) >= 10:
            try:
                from scipy.interpolate import splprep, splev
                cx = np.append(pts_x, pts_x[0])
                cy = np.append(pts_y, pts_y[0])
                n = len(cx)
                tck, _ = splprep([cx, cy], s=n * 2.0, per=True, k=3)
                n_out = max(12, n // 4)
                u_new = np.linspace(0, 1, n_out, endpoint=False)
                xn, yn = splev(u_new, tck)
                pts = [[round(float(x), 1), round(float(y), 1)] for x, y in zip(xn, yn)]
                # Skip if any NaN/Inf
                if all(np.isfinite(pt[0]) and np.isfinite(pt[1]) for pt in pts):
                    result.append(pts)
                    continue
            except Exception:
                pass
        pts = [[round(float(x), 1), round(float(y), 1)] for x, y in zip(pts_x, pts_y)]
        if all(np.isfinite(pt[0]) and np.isfinite(pt[1]) for pt in pts):
            result.append(pts)
    return result


def t1_to_png_slice(t1_slice: np.ndarray, wc: int, ww: int):
    from PIL import Image
    lo = wc - ww / 2
    hi = wc + ww / 2
    arr = np.clip(t1_slice, lo, hi)
    arr = ((arr - lo) / (hi - lo) * 255).astype(np.uint8)
    return Image.fromarray(arr)


def build_atlas(parc_path: Path, t1_path: Path, label_map: dict, out_dir: Path):
    import nibabel as nib

    print(f"\nLoading parcellation: {parc_path}")
    parc_img = nib.load(parc_path)
    parc_data = parc_img.get_fdata(dtype=np.float32)
    print(f"Parcellation shape: {parc_data.shape}")

    print(f"Loading T1: {t1_path}")
    t1_img = nib.load(t1_path)
    t1_data = t1_img.get_fdata(dtype=np.float32)
    print(f"T1 shape: {t1_data.shape}")

    # Use parcellation space (same shape as T1 output)
    assert parc_data.shape == t1_data.shape, \
        f"Shape mismatch: parc={parc_data.shape} t1={t1_data.shape}"

    planes = {
        "axial":    (2, parc_data.shape[2]),
        "sagittal": (0, parc_data.shape[0]),
        "coronal":  (1, parc_data.shape[1]),
    }

    # Build structure list from present labels
    present_labels = set(np.unique(parc_data.astype(int)))
    present_labels.discard(0)

    structures = []
    struct_by_id = {}
    for roi_idx, (label, region) in sorted(label_map.items()):
        if roi_idx not in present_labels:
            continue
        cat = get_category(label, region)
        color = CATEGORY_COLORS.get(cat, CATEGORY_COLORS["other"])
        display_en = region.title()
        s = {
            "id": roi_idx,
            "name": label,
            "displayName": {"en": display_en, "ko": display_en},
            "category": cat,
            "color": color,
            "bestSlice": {},
            "sliceRange": {},
        }
        structures.append(s)
        struct_by_id[roi_idx] = s

    print(f"\nBuilding atlas for {len(structures)} structures -> {out_dir}")

    for plane_name, (axis, n_slices) in planes.items():
        img_dir   = out_dir / plane_name
        label_dir = out_dir / "labels" / plane_name
        img_dir.mkdir(parents=True, exist_ok=True)
        label_dir.mkdir(parents=True, exist_ok=True)
        print(f"  {plane_name}: {n_slices} slices...")

        for si in range(n_slices):
            if axis == 0:   t1_sl = t1_data[si, :, :]; parc_sl = parc_data[si, :, :]
            elif axis == 1: t1_sl = t1_data[:, si, :]; parc_sl = parc_data[:, si, :]
            else:           t1_sl = t1_data[:, :, si]; parc_sl = parc_data[:, :, si]

            # Standard display: transpose + flipud (RAS: axial→anterior@top, sagittal/coronal→superior@top)
            t1_disp = np.flipud(t1_sl.T)
            t1_to_png_slice(t1_disp, WINDOW_CENTER, WINDOW_WIDTH).save(
                img_dir / f"{si:04d}.png"
            )

            slice_labels = []
            present_in_slice = set(np.unique(parc_sl.astype(int)))
            present_in_slice.discard(0)

            for roi_idx in present_in_slice:
                if roi_idx not in struct_by_id:
                    continue
                mask = np.flipud((parc_sl == roi_idx).T)
                contours = mask_to_contours(mask.astype(np.float32))
                if not contours:
                    continue

                struct = struct_by_id[roi_idx]
                slice_labels.append({"id": int(roi_idx), "name": struct["name"], "contours": contours})

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
        "voxelSpacing": [1.0, 1.0, 1.0],
        "source": "OpenMAP-T1 Level5 (275 regions)",
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
    parser.add_argument("--parc",  type=Path, default=PARC_NII)
    parser.add_argument("--t1",    type=Path, default=T1_NII)
    parser.add_argument("--csv",   type=Path, default=LABEL_CSV)
    parser.add_argument("--out",   type=Path, default=OUT_DIR)
    args = parser.parse_args()

    label_map = load_label_map(args.csv)
    build_atlas(args.parc, args.t1, label_map, args.out)
    print("\nDone. Run: npm run dev to verify brain-mri atlas.")


if __name__ == "__main__":
    main()
