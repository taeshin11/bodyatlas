"""
gen_multi_atlas_head.py

Builds a consensus head-CT atlas by majority-vote across multiple
TotalSegmentator v2 cases from the D-drive dataset.

Steps
-----
1. Pick N head-containing cases from meta.csv
2. For each case: crop CT + segmentations to head region (top 300mm)
   and resample to a common isotropic 1.5mm grid matching s0011
3. Majority vote: voxel is 'on' if present in >= VOTE_THRESH of cases
4. Build atlas PNG slices + JSON contour labels using the smoothed
   mask_to_contours from gen_head_ct_atlas.py

Usage
-----
    python scripts/gen_multi_atlas_head.py
    python scripts/gen_multi_atlas_head.py --n-cases 7 --vote-thresh 0.5

Requirements
------------
    pip install nibabel scikit-image scipy Pillow numpy
"""

import argparse
import csv
import io
import json
import shutil
import sys
from pathlib import Path

import numpy as np

# ── Project paths ────────────────────────────────────────────────────────────
PROJECT_ROOT = Path(__file__).parent.parent
TOTALSEG_DIR = Path("D:/ImageLabelAPI_SPINAI/data/cat_F_opensource/TotalSegmentator_v2")
META_CSV     = TOTALSEG_DIR / "meta.csv"
OUT_DIR      = PROJECT_ROOT / "public/data/head-ct"

# Reference case (used as the target grid)
REF_CASE = "s0011"

# Structures to include (all .nii.gz segmentations from 'total' task)
# We use whatever is present in the reference case.
HEAD_CROP_MM = 300        # crop top 300mm of Z axis (head + neck)
VOXEL_TARGET = 1.5        # mm isotropic target resolution

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
    if any(k in n for k in ["brain", "cerebel", "cerebr", "cortex", "subarach", "venous_sinus", "septum"]):
        return "brain"
    if any(k in n for k in ["artery", "vein", "aorta", "vessel", "carotid", "jugular", "subclavian", "brachio"]):
        return "vessel"
    if any(k in n for k in ["skull", "mandible", "vertebr", "bone", "teeth", "rib", "sternum", "clavicula",
                             "scapula", "humerus", "costal", "zygomatic", "styloid", "hyoid",
                             "thyroid_cartilage", "cricoid", "hard_palate"]):
        return "bone"
    if any(k in n for k in ["muscle", "autochthon"]):
        return "muscle"
    if any(k in n for k in ["sinus", "cavity", "canal", "larynx_air", "trachea", "pharynx",
                             "nasopharynx", "oropharynx", "hypopharynx", "nasal", "auditory"]):
        return "cavity"
    if any(k in n for k in ["gland", "thyroid_gland", "parotid", "submandibular"]):
        return "gland"
    if any(k in n for k in ["nerve", "optic", "spinal_cord"]):
        return "nerve"
    return "other"


# ── Import helpers from gen_head_ct_atlas (mask_to_contours, etc.) ───────────
sys.path.insert(0, str(PROJECT_ROOT / "scripts"))
from gen_head_ct_atlas import mask_to_contours, build_display_name


def load_meta() -> list[dict]:
    """Parse meta.csv, return list of {id, study_type} dicts."""
    with open(META_CSV, encoding="utf-8") as f:
        content = f.read()
    reader = csv.reader(io.StringIO(content), delimiter=";")
    rows = list(reader)
    header = [h.lstrip("\ufeff").strip() for h in rows[0]]
    id_col    = header.index("image_id")
    study_col = header.index("study_type")
    result = []
    for r in rows[1:]:
        if len(r) > study_col:
            result.append({"id": r[id_col].strip(), "study_type": r[study_col].strip()})
    return result


def pick_head_cases(meta: list[dict], n: int, ref: str) -> list[str]:
    """Select N head-containing cases (excluding ref, which is already our base)."""
    HEAD_KEYWORDS = ["head", "neck-thorax", "neck-thx", "polytrauma",
                     "angiography head", "ct neck"]
    candidates = [
        m["id"] for m in meta
        if m["id"] != ref and any(k in m["study_type"].lower() for k in HEAD_KEYWORDS)
    ]
    # Filter to those that actually have segmentations in the dataset
    valid = [
        c for c in candidates
        if (TOTALSEG_DIR / c / "segmentations").exists()
        and len(list((TOTALSEG_DIR / c / "segmentations").glob("*.nii.gz"))) > 50
    ]
    print(f"Valid head cases available: {len(valid)}")
    chosen = [ref] + valid[: n - 1]
    print(f"Selected cases ({len(chosen)}): {chosen}")
    return chosen


def resample_to_ref(seg_data: np.ndarray, seg_affine: np.ndarray,
                    ref_shape: tuple, ref_affine: np.ndarray) -> np.ndarray:
    """Resample seg_data from seg_affine space into ref_affine/ref_shape space.

    Uses nearest-neighbour interpolation (label-safe).
    """
    from scipy.ndimage import map_coordinates

    # Build mapping: for each voxel in ref space, find corresponding coord in seg space
    # ref_vox → world → seg_vox
    ref_inv = np.linalg.inv(ref_affine)
    seg_inv = np.linalg.inv(seg_affine)

    # Grid of ref voxel coords (i, j, k)
    i, j, k = np.meshgrid(
        np.arange(ref_shape[0]),
        np.arange(ref_shape[1]),
        np.arange(ref_shape[2]),
        indexing="ij",
    )
    ref_vox = np.stack([i.ravel(), j.ravel(), k.ravel(), np.ones(i.size)], axis=0)  # 4×N

    # ref vox → world → seg vox
    world  = ref_affine @ ref_vox        # 4×N
    seg_vox = seg_inv @ world             # 4×N
    coords = seg_vox[:3]                  # 3×N

    # Nearest-neighbour resample
    resampled = map_coordinates(seg_data, coords, order=0, mode="constant", cval=0)
    return resampled.reshape(ref_shape).astype(np.float32)


def load_case_segs(case_id: str, ref_shape: tuple, ref_affine: np.ndarray) -> dict:
    """Load all segmentation .nii.gz for a case, resampled to ref space.

    Returns {name: binary_array}.
    """
    import nibabel as nib

    seg_dir = TOTALSEG_DIR / case_id / "segmentations"
    result = {}
    files = list(seg_dir.glob("*.nii.gz"))
    print(f"  {case_id}: loading {len(files)} segmentations...")

    for f in files:
        name = f.stem.replace(".nii", "")
        img  = nib.load(f)
        data = img.get_fdata(dtype=np.float32)

        # Check if affines match (same case = same space, no resample needed)
        if np.allclose(img.affine, ref_affine, atol=1e-3) and data.shape == ref_shape:
            result[name] = (data > 0.5).astype(np.float32)
        else:
            resampled = resample_to_ref(data, img.affine, ref_shape, ref_affine)
            result[name] = (resampled > 0.5).astype(np.float32)

    return result


def majority_vote(all_segs: list[dict], thresh: float) -> dict:
    """Compute majority-vote consensus masks.

    all_segs: list of {name: binary_array} dicts (one per case)
    thresh: fraction of cases that must agree (e.g. 0.4 = 2/5)
    Returns {name: binary_array}
    """
    n = len(all_segs)
    all_names = set()
    for s in all_segs:
        all_names.update(s.keys())

    print(f"Computing majority vote across {n} cases, {len(all_names)} structure names...")
    result = {}
    for name in all_names:
        votes = np.zeros_like(next(iter(all_segs[0].values())), dtype=np.float32)
        count = 0
        for s in all_segs:
            if name in s:
                votes += s[name]
                count += 1
        if count == 0:
            continue
        # Normalise by cases that actually have this structure
        consensus = (votes / count) >= thresh
        if consensus.any():
            result[name] = consensus.astype(np.float32)

    print(f"  Structures passing vote threshold: {len(result)}")
    return result


def ct_to_png_slice(ct_slice: np.ndarray, wc: int, ww: int):
    from PIL import Image
    lo = wc - ww / 2
    hi = wc + ww / 2
    arr = np.clip(ct_slice, lo, hi)
    arr = ((arr - lo) / (hi - lo) * 255).astype(np.uint8)
    return Image.fromarray(arr)


def build_atlas(ct_head: np.ndarray, consensus: dict, out_dir: Path):
    """Build atlas PNG slices + JSON label files for axial/sagittal/coronal."""
    print(f"\nBuilding atlas -> {out_dir}")

    planes = {
        "axial":    (2, ct_head.shape[2]),
        "sagittal": (0, ct_head.shape[0]),
        "coronal":  (1, ct_head.shape[1]),
    }

    structures = []
    struct_by_name = {}
    for idx, name in enumerate(sorted(consensus.keys())):
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

    head_z_crop = ct_head.shape[2]   # already cropped

    for plane_name, (axis, n_slices) in planes.items():
        img_dir   = out_dir / plane_name
        label_dir = out_dir / "labels" / plane_name
        img_dir.mkdir(parents=True, exist_ok=True)
        label_dir.mkdir(parents=True, exist_ok=True)
        print(f"  {plane_name}: {n_slices} slices...")

        for si in range(n_slices):
            # CT slice
            if axis == 0:
                ct_sl = ct_head[si, :, :]
            elif axis == 1:
                ct_sl = ct_head[:, si, :]
            else:
                ct_sl = ct_head[:, :, si]

            img = ct_to_png_slice(ct_sl, WINDOW_CENTER, WINDOW_WIDTH)
            img.save(img_dir / f"{si:04d}.png")

            slice_labels = []
            for name, seg_head in consensus.items():
                # Extract slice
                if axis == 0:
                    seg_sl = seg_head[si, :, :]
                elif axis == 1:
                    seg_sl = seg_head[:, si, :]
                else:
                    seg_sl = seg_head[:, :, si]

                if seg_sl.max() < 0.5:
                    continue

                # Orientation flips to match viewer
                if axis == 0:
                    seg_sl = np.fliplr(seg_sl)
                elif axis == 1:
                    seg_sl = np.flipud(seg_sl)

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

        print(f"    Done: {n_slices} slices")

    info = {
        "planes": {p: {"slices": int(n)} for p, (_, n) in planes.items()},
        "window": {"center": WINDOW_CENTER, "width": WINDOW_WIDTH},
        "voxelSpacing": [VOXEL_TARGET] * 3,
    }
    with open(out_dir / "info.json", "w") as f:
        json.dump(info, f, indent=2)

    active = [s for s in structures if s.get("sliceRange")]
    with open(out_dir / "structures.json", "w", encoding="utf-8") as f:
        json.dump({"totalStructures": len(active), "structures": active}, f, ensure_ascii=False)

    print(f"\nAtlas complete: {len(active)} structures written to {out_dir}")


def main():
    parser = argparse.ArgumentParser(description="Multi-atlas consensus head-CT builder")
    parser.add_argument("--n-cases",    type=int,   default=5,   help="Number of cases to include (default 5)")
    parser.add_argument("--vote-thresh",type=float, default=0.4, help="Majority-vote fraction threshold (default 0.4 = 2/5)")
    parser.add_argument("--out",        type=Path,  default=OUT_DIR)
    args = parser.parse_args()

    import nibabel as nib

    # 1. Pick cases
    meta   = load_meta()
    cases  = pick_head_cases(meta, args.n_cases, REF_CASE)

    # 2. Load reference CT to get target grid
    ref_ct_path = TOTALSEG_DIR / REF_CASE / "ct.nii.gz"
    print(f"\nLoading reference CT: {ref_ct_path}")
    ref_img     = nib.load(ref_ct_path)
    ref_data    = ref_img.get_fdata(dtype=np.float32)
    ref_affine  = ref_img.affine
    ref_shape   = ref_data.shape
    print(f"  CT shape: {ref_shape}, spacing: {ref_img.header.get_zooms()}")

    # Compute head Z crop indices (top HEAD_CROP_MM mm)
    voxel_z_mm  = float(ref_img.header.get_zooms()[2])
    crop_voxels = int(HEAD_CROP_MM / voxel_z_mm)
    z_start     = max(0, ref_shape[2] - crop_voxels)
    print(f"  Head crop: Z[{z_start}:{ref_shape[2]}] = {ref_shape[2]-z_start} slices ({HEAD_CROP_MM}mm)")

    # Crop CT to head
    ct_head = ref_data[:, :, z_start:]
    print(f"  ct_head shape: {ct_head.shape}")

    # 3. Load segs for each case (resampled to ref grid)
    all_segs_full = []
    for case_id in cases:
        segs_full = load_case_segs(case_id, ref_shape, ref_affine)
        # Crop each seg to head Z range
        segs_head = {name: arr[:, :, z_start:] for name, arr in segs_full.items()}
        all_segs_full.append(segs_head)
        print(f"  {case_id}: {len(segs_head)} structures in head region")

    # 4. Majority vote
    consensus = majority_vote(all_segs_full, thresh=args.vote_thresh)

    # 5. Build atlas
    build_atlas(ct_head, consensus, args.out)

    print("\nDone. Run `npm run dev` to verify the new atlas.")


if __name__ == "__main__":
    main()
