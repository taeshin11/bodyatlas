"""
gen_multi_atlas_head.py

Builds a consensus head-CT atlas by majority-vote across multiple
TotalSegmentator v2 cases from the D-drive dataset.

Memory-efficient: loads ONE structure at a time across all cases.

Steps
-----
1. Pick N head-containing cases from meta.csv
2. Load reference CT to establish the target voxel grid
3. For each structure name (one at a time):
   - Load that .nii.gz from each case, resample to ref grid, majority-vote
   - Keep consensus mask if it passes vote threshold
4. Build atlas PNG slices + JSON contour labels

Usage
-----
    python scripts/gen_multi_atlas_head.py
    python scripts/gen_multi_atlas_head.py --n-cases 5 --vote-thresh 0.4

Requirements
------------
    pip install nibabel scikit-image scipy Pillow numpy
"""

import argparse
import csv
import io
import json
import sys
from pathlib import Path

import numpy as np

# ── Project paths ────────────────────────────────────────────────────────────
PROJECT_ROOT = Path(__file__).parent.parent
TOTALSEG_DIR = Path("D:/ImageLabelAPI_SPINAI/data/cat_F_opensource/TotalSegmentator_v2")
META_CSV     = TOTALSEG_DIR / "meta.csv"
OUT_DIR      = PROJECT_ROOT / "public/data/head-ct"

REF_CASE     = "s0011"
HEAD_CROP_MM = 300        # top 300mm = head + neck
VOXEL_TARGET = 1.5        # mm isotropic

WINDOW_CENTER = 40
WINDOW_WIDTH  = 80

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


def get_category(name: str) -> str:
    n = name.lower()
    if any(k in n for k in ["brain","cerebel","cerebr","cortex","subarach","venous_sinus","septum"]):
        return "brain"
    if any(k in n for k in ["artery","vein","aorta","vessel","carotid","jugular","subclavian","brachio"]):
        return "vessel"
    if any(k in n for k in ["skull","mandible","vertebr","bone","teeth","rib","sternum","clavicula",
                             "scapula","humerus","costal","zygomatic","styloid","hyoid",
                             "thyroid_cartilage","cricoid","hard_palate"]):
        return "bone"
    if any(k in n for k in ["muscle","autochthon"]):
        return "muscle"
    if any(k in n for k in ["sinus","cavity","canal","larynx_air","trachea","pharynx",
                             "nasopharynx","oropharynx","hypopharynx","nasal","auditory"]):
        return "cavity"
    if any(k in n for k in ["gland","thyroid_gland","parotid","submandibular"]):
        return "gland"
    if any(k in n for k in ["nerve","optic","spinal_cord"]):
        return "nerve"
    return "other"


sys.path.insert(0, str(PROJECT_ROOT / "scripts"))
from gen_head_ct_atlas import mask_to_contours, build_display_name


# ── Meta / case selection ────────────────────────────────────────────────────

def load_meta() -> list:
    with open(META_CSV, encoding="utf-8") as f:
        content = f.read()
    reader = csv.reader(io.StringIO(content), delimiter=";")
    rows   = list(reader)
    header = [h.lstrip("\ufeff").strip() for h in rows[0]]
    id_col    = header.index("image_id")
    study_col = header.index("study_type")
    return [{"id": r[id_col].strip(), "study_type": r[study_col].strip()}
            for r in rows[1:] if len(r) > study_col]


def pick_head_cases(meta: list, n: int, ref: str) -> list:
    HEAD_KW = ["head","neck-thorax","neck-thx","polytrauma","angiography head","ct neck"]
    candidates = [
        m["id"] for m in meta
        if m["id"] != ref and any(k in m["study_type"].lower() for k in HEAD_KW)
    ]
    valid = [
        c for c in candidates
        if (TOTALSEG_DIR / c / "segmentations").exists()
        and len(list((TOTALSEG_DIR / c / "segmentations").glob("*.nii.gz"))) > 50
    ]
    print(f"Valid head cases: {len(valid)}, picking {n-1} + ref={ref}")
    return [ref] + valid[: n - 1]


# ── Resampling ───────────────────────────────────────────────────────────────

def resample_to_ref(seg_data, seg_affine, ref_shape, ref_affine):
    """Nearest-neighbour resample seg_data into ref space."""
    from scipy.ndimage import map_coordinates

    seg_inv = np.linalg.inv(seg_affine)

    i, j, k = np.meshgrid(
        np.arange(ref_shape[0]),
        np.arange(ref_shape[1]),
        np.arange(ref_shape[2]),
        indexing="ij",
    )
    ref_vox = np.stack([i.ravel(), j.ravel(), k.ravel(), np.ones(i.size)], axis=0)
    world   = ref_affine @ ref_vox
    seg_vox = seg_inv @ world
    coords  = seg_vox[:3]

    out = map_coordinates(seg_data.astype(np.float32), coords, order=0, mode="constant", cval=0)
    return out.reshape(ref_shape).astype(np.float32)


# ── Core consensus builder ───────────────────────────────────────────────────

def build_consensus_masks(cases, ref_shape, ref_affine, z_start, vote_thresh):
    """Iterate over all structure names; for each: load from N cases, resample,
    majority-vote, crop to head. Yields (name, consensus_head_mask) one at a time.

    Memory peak: O(N * ref_voxels) per structure, not O(N * structures * ref_voxels).
    """
    import nibabel as nib

    # Collect all structure names (union across all cases)
    all_names = set()
    for case_id in cases:
        seg_dir = TOTALSEG_DIR / case_id / "segmentations"
        all_names.update(f.stem.replace(".nii", "") for f in seg_dir.glob("*.nii.gz"))
    all_names = sorted(all_names)
    print(f"Total unique structure names across {len(cases)} cases: {len(all_names)}")

    n_cases = len(cases)
    passed  = 0

    for idx, name in enumerate(all_names):
        if idx % 20 == 0:
            print(f"  Structure {idx+1}/{len(all_names)}: {name} ...", flush=True)

        votes = np.zeros(ref_shape, dtype=np.float32)
        count = 0

        for case_id in cases:
            seg_path = TOTALSEG_DIR / case_id / "segmentations" / f"{name}.nii.gz"
            if not seg_path.exists():
                continue
            try:
                img  = nib.load(seg_path)
                data = img.get_fdata(dtype=np.float32)
                if data.max() < 0.5:
                    continue
                if np.allclose(img.affine, ref_affine, atol=1e-3) and data.shape == ref_shape:
                    votes += (data > 0.5).astype(np.float32)
                else:
                    resampled = resample_to_ref(data, img.affine, ref_shape, ref_affine)
                    votes += (resampled > 0.5).astype(np.float32)
                count += 1
            except Exception as e:
                print(f"    WARNING: {case_id}/{name}: {e}")

        if count == 0:
            continue

        consensus = (votes / count) >= vote_thresh
        # Crop to head Z range
        consensus_head = consensus[:, :, z_start:]
        if consensus_head.any():
            passed += 1
            yield name, consensus_head.astype(np.float32)

    print(f"\nConsensus: {passed}/{len(all_names)} structures passed vote threshold {vote_thresh}")


# ── Atlas builder ────────────────────────────────────────────────────────────

def ct_to_png_slice(ct_slice, wc, ww):
    from PIL import Image
    lo  = wc - ww / 2
    hi  = wc + ww / 2
    arr = np.clip(ct_slice, lo, hi)
    arr = ((arr - lo) / (hi - lo) * 255).astype(np.uint8)
    return Image.fromarray(arr)


def build_atlas(ct_head, consensus_iter, out_dir):
    """Stream consensus masks one at a time and build atlas files.

    consensus_iter: iterable of (name, head_mask) — consumed once.
    We do two passes:
      Pass 1: collect all (name, mask) — necessary to write per-slice JSON.
              We can't avoid holding all masks if we want per-slice labels.
              BUT: we write per-slice during pass 1 by building a dict of
              slice → labels on the fly, keeping only sparse data (contours).

    Memory strategy: we never hold ALL voxel masks simultaneously.
    Instead, for each structure we immediately compute all its slice contours
    (for all planes) and store only the JSON-sized data.
    """
    print(f"\nBuilding atlas -> {out_dir}")
    out_dir.mkdir(parents=True, exist_ok=True)

    planes = {
        "axial":    (2, ct_head.shape[2]),
        "sagittal": (0, ct_head.shape[0]),
        "coronal":  (1, ct_head.shape[1]),
    }

    # Pre-create output dirs and pre-save CT PNG slices
    print("  Saving CT PNG slices...")
    for plane_name, (axis, n_slices) in planes.items():
        img_dir   = out_dir / plane_name
        label_dir = out_dir / "labels" / plane_name
        img_dir.mkdir(parents=True, exist_ok=True)
        label_dir.mkdir(parents=True, exist_ok=True)

        for si in range(n_slices):
            if axis == 0:
                sl = ct_head[si, :, :]
            elif axis == 1:
                sl = ct_head[:, si, :]
            else:
                sl = ct_head[:, :, si]
            ct_to_png_slice(sl, WINDOW_CENTER, WINDOW_WIDTH).save(img_dir / f"{si:04d}.png")

        print(f"    {plane_name}: {n_slices} PNGs saved")

    # Accumulate per-slice label dicts: {plane: {slice_idx: [label_entry, ...]}}
    slice_labels = {p: {si: [] for si in range(n)} for p, (_, n) in planes.items()}
    structures   = []
    struct_idx   = 0

    print("  Processing structure masks...")
    for name, mask_head in consensus_iter:
        cat   = get_category(name)
        color = CATEGORY_COLORS.get(cat, CATEGORY_COLORS["other"])
        s = {
            "id": struct_idx, "name": name,
            "displayName": build_display_name(name),
            "category": cat, "color": color,
            "bestSlice": {}, "sliceRange": {},
        }

        for plane_name, (axis, n_slices) in planes.items():
            for si in range(n_slices):
                if axis == 0:
                    seg_sl = mask_head[si, :, :]
                elif axis == 1:
                    seg_sl = mask_head[:, si, :]
                else:
                    seg_sl = mask_head[:, :, si]

                if seg_sl.max() < 0.5:
                    continue

                if axis == 0:
                    seg_sl = np.fliplr(seg_sl)
                elif axis == 1:
                    seg_sl = np.flipud(seg_sl)

                contours = mask_to_contours(seg_sl)
                if not contours:
                    continue

                slice_labels[plane_name][si].append({
                    "id": struct_idx, "name": name, "contours": contours
                })
                r = s["sliceRange"].setdefault(plane_name, [si, si])
                r[0] = min(r[0], si)
                r[1] = max(r[1], si)

        for plane_name, (_, n_slices) in planes.items():
            r = s["sliceRange"].get(plane_name)
            s["bestSlice"][plane_name] = (r[0] + r[1]) // 2 if r else n_slices // 2

        if s.get("sliceRange"):
            structures.append(s)
            struct_idx += 1
            if struct_idx % 10 == 0:
                print(f"    {struct_idx} structures processed so far...", flush=True)

    # Write label JSON files
    print("  Writing label JSON files...")
    for plane_name, (_, n_slices) in planes.items():
        label_dir = out_dir / "labels" / plane_name
        for si in range(n_slices):
            with open(label_dir / f"{si:04d}.json", "w") as f:
                json.dump(slice_labels[plane_name][si], f)
        print(f"    {plane_name}: {n_slices} label files written")

    # Write info.json + structures.json
    info = {
        "planes": {p: {"slices": int(n)} for p, (_, n) in planes.items()},
        "window": {"center": WINDOW_CENTER, "width": WINDOW_WIDTH},
        "voxelSpacing": [VOXEL_TARGET] * 3,
    }
    with open(out_dir / "info.json", "w") as f:
        json.dump(info, f, indent=2)

    with open(out_dir / "structures.json", "w", encoding="utf-8") as f:
        json.dump({"totalStructures": len(structures), "structures": structures},
                  f, ensure_ascii=False)

    print(f"\nAtlas complete: {len(structures)} structures -> {out_dir}")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--n-cases",     type=int,   default=5,   help="Cases to include (default 5)")
    parser.add_argument("--vote-thresh", type=float, default=0.4, help="Vote fraction (default 0.4 = 2/5)")
    parser.add_argument("--out",         type=Path,  default=OUT_DIR)
    args = parser.parse_args()

    import nibabel as nib

    meta   = load_meta()
    cases  = pick_head_cases(meta, args.n_cases, REF_CASE)
    print(f"Cases: {cases}")

    # Load reference CT
    ref_ct_path = TOTALSEG_DIR / REF_CASE / "ct.nii.gz"
    print(f"\nLoading reference CT: {ref_ct_path}")
    ref_img    = nib.load(ref_ct_path)
    ref_data   = ref_img.get_fdata(dtype=np.float32)
    ref_affine = ref_img.affine
    ref_shape  = ref_data.shape
    print(f"  Shape: {ref_shape}, spacing: {ref_img.header.get_zooms()}")

    voxel_z_mm  = float(ref_img.header.get_zooms()[2])
    crop_voxels = int(HEAD_CROP_MM / voxel_z_mm)
    z_start     = max(0, ref_shape[2] - crop_voxels)
    print(f"  Head crop: Z[{z_start}:{ref_shape[2]}] = {ref_shape[2]-z_start} slices")

    ct_head = ref_data[:, :, z_start:]
    del ref_data   # free memory

    # Stream consensus masks
    consensus_iter = build_consensus_masks(cases, ref_shape, ref_affine, z_start,
                                           vote_thresh=args.vote_thresh)

    # Build atlas
    build_atlas(ct_head, consensus_iter, args.out)
    print("\nDone. Run `npm run dev` to verify.")


if __name__ == "__main__":
    main()
