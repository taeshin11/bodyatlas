"""
gen_head_ct_atlas.py

Generates BodyAtlas head-ct data from a full-body CT NIfTI using TotalSegmentator v2.
Replaces public/data/head-ct/ with higher-quality segmentation (117+ structures).

Usage:
    # Step 1 — extract CT from Zenodo ZIP (run once)
    python scripts/gen_head_ct_atlas.py --extract-only

    # Step 2 — run TotalSegmentator + build atlas (needs GPU)
    python scripts/gen_head_ct_atlas.py

    # Full pipeline with explicit CT path
    python scripts/gen_head_ct_atlas.py --ct path/to/head_ct.nii.gz

Requirements:
    pip install TotalSegmentator nibabel scipy Pillow

GPU: RTX 4090 recommended, ~4GB VRAM needed per task
Estimated time: ~30 min total (all head tasks)
"""

import argparse
import json
import os
import shutil
import zipfile
from pathlib import Path

import numpy as np

# ── Paths ────────────────────────────────────────────────────────────────────
PROJECT_ROOT  = Path(__file__).parent.parent
PIPELINE_DIR  = PROJECT_ROOT / "data_pipeline"
ZIP_PATH      = PIPELINE_DIR / "totalseg_small.zip"
CT_DIR        = PIPELINE_DIR / "head_ct_case"
CT_PATH       = CT_DIR / "ct.nii.gz"
SEG_DIR       = PIPELINE_DIR / "head_ct_seg"
OUT_DIR       = PROJECT_ROOT / "public/data/head-ct"

# ── Head-specific TotalSegmentator tasks ─────────────────────────────────────
HEAD_TASKS = [
    "total",                  # All 104 structures (includes head/neck basics)
    "head_glands_cavities",   # Eyes, lenses, optic nerves, sinuses, glands
    "headneck_bones_vessels", # Larynx, cartilages, neck vessels
    "brain_structures",       # Brain subregions, venous sinuses
    "craniofacial_structures",# Mandible, skull, facial sinuses
]

# ── Atlas config ─────────────────────────────────────────────────────────────
WINDOW_CENTER = 40
WINDOW_WIDTH  = 80      # Soft tissue window (good for brain)
VOXEL_TARGET  = 1.5     # mm

# ── Head region crop ─────────────────────────────────────────────────────────
# Muschelli template is 512^3 at 0.5mm. Crop to skull region [106:418] in Z.
HEAD_Z_START = 106
HEAD_Z_END = 418  # exclusive

# ── Structure colors by category ─────────────────────────────────────────────
CATEGORY_COLORS = {
    "bone":    "#F59E0B",
    "organ":   "#EF4444",
    "vessel":  "#3B82F6",
    "muscle":  "#10B981",
    "cavity":  "#8B5CF6",
    "gland":   "#F97316",
    "nerve":   "#EC4899",
    "brain":   "#6366F1",
    "other":   "#94A3B8",
}

# ── Category mapping for structure names ─────────────────────────────────────
def get_category(name: str) -> str:
    n = name.lower()
    if any(k in n for k in ["brain", "cerebel", "cerebr", "cortex", "subarach", "venous_sinus", "septum"]): return "brain"
    if any(k in n for k in ["artery", "vein", "aorta", "vessel", "carotid", "jugular", "subclavian", "brachio"]): return "vessel"
    if any(k in n for k in ["skull", "mandible", "vertebr", "bone", "teeth", "rib", "sternum", "clavicula", "scapula", "humerus", "costal", "zygomatic", "styloid", "hyoid", "thyroid_cartilage", "cricoid", "hard_palate"]): return "bone"
    if any(k in n for k in ["muscle", "autochthon"]): return "muscle"
    if any(k in n for k in ["sinus", "cavity", "canal", "larynx_air", "trachea", "pharynx", "nasopharynx", "oropharynx", "hypopharynx", "nasal", "auditory"]): return "cavity"
    if any(k in n for k in ["gland", "thyroid_gland", "parotid", "submandibular"]): return "gland"
    if any(k in n for k in ["nerve", "optic", "spinal_cord"]): return "nerve"
    if any(k in n for k in ["eye", "lens", "optic_nerve"]): return "nerve"
    if any(k in n for k in ["lung", "heart", "esophagus"]): return "organ"
    return "other"


def extract_ct_from_zip():
    """Extract s0001/ct.nii.gz from the Zenodo ZIP."""
    if CT_PATH.exists():
        print(f"CT already extracted: {CT_PATH}")
        return True
    if not ZIP_PATH.exists():
        print(f"ERROR: ZIP not found at {ZIP_PATH}")
        print("Download it first: see data_pipeline/totalseg_small.zip")
        return False

    print(f"Extracting s0001/ct.nii.gz from {ZIP_PATH} ({ZIP_PATH.stat().st_size//1024//1024}MB)...")
    CT_DIR.mkdir(parents=True, exist_ok=True)

    with zipfile.ZipFile(ZIP_PATH) as z:
        names = z.namelist()
        ct_candidates = [n for n in names if n.endswith("ct.nii.gz")]
        if not ct_candidates:
            print(f"ERROR: no ct.nii.gz found. Files: {names[:20]}")
            return False
        target = ct_candidates[0]
        print(f"Extracting: {target}")
        with z.open(target) as src, open(CT_PATH, 'wb') as dst:
            shutil.copyfileobj(src, dst)

    print(f"Extracted to {CT_PATH} ({CT_PATH.stat().st_size//1024//1024}MB)")
    return True


def run_totalsegmentator():
    """Run TotalSegmentator with all head tasks on the CT."""
    from totalsegmentator.python_api import totalsegmentator

    SEG_DIR.mkdir(parents=True, exist_ok=True)

    import torch
    device = "gpu" if torch.cuda.is_available() else "cpu"
    vram_free = 0
    if torch.cuda.is_available():
        vram_free = torch.cuda.mem_get_info()[0] // 1024 // 1024
        vram_total = torch.cuda.mem_get_info()[1] // 1024 // 1024
        print(f"GPU: {torch.cuda.get_device_name(0)} - {vram_free}MB free / {vram_total}MB total")
        if vram_free < 4000:
            print(f"WARNING: Only {vram_free}MB VRAM free. Some tasks may fail. Consider freeing VRAM first.")

    for task in HEAD_TASKS:
        task_seg_dir = SEG_DIR / task
        task_seg_dir.mkdir(parents=True, exist_ok=True)
        print(f"\n{'='*60}")
        print(f"Running task: {task}")
        print(f"{'='*60}")

        # Check VRAM before each task
        if torch.cuda.is_available():
            vram_free = torch.cuda.mem_get_info()[0] // 1024 // 1024
            print(f"  VRAM free: {vram_free}MB")
            if vram_free < 3000:
                print(f"  WARNING: Low VRAM ({vram_free}MB). Task may fail or be slow.")

        try:
            totalsegmentator(
                input=CT_PATH,
                output=task_seg_dir,
                task=task,
                device=device,
                quiet=False,
            )
            segs = list(task_seg_dir.glob("*.nii.gz"))
            print(f"  Generated {len(segs)} segmentation files")
        except Exception as e:
            print(f"  ERROR in task {task}: {e}")
            continue

    print("\nTotalSegmentator complete.")


def merge_segmentations():
    """Merge all task segmentation dirs into a flat dict: name → nii array."""
    import nibabel as nib

    print("Merging segmentations from all tasks...")
    merged = {}

    for task_dir in SEG_DIR.iterdir():
        if not task_dir.is_dir(): continue
        for seg_file in task_dir.glob("*.nii.gz"):
            name = seg_file.stem.replace(".nii", "")
            if name in merged:
                continue  # already have it from earlier task
            img = nib.load(seg_file)
            data = img.get_fdata(dtype=np.float32)
            if data.max() > 0:  # only keep non-empty masks
                merged[name] = (data, img.affine)

    print(f"Total merged structures: {len(merged)}")
    return merged


def ct_to_png_slice(ct_slice: np.ndarray, window_center: int, window_width: int) -> "PIL.Image":
    """Convert CT HU slice → 8-bit grayscale PNG."""
    from PIL import Image

    lo = window_center - window_width / 2
    hi = window_center + window_width / 2
    arr = np.clip(ct_slice, lo, hi)
    arr = ((arr - lo) / (hi - lo) * 255).astype(np.uint8)
    return Image.fromarray(arr)


def mask_to_contours(mask_2d: np.ndarray) -> list:
    """Convert binary mask slice → smoothed contour point arrays.

    Pipeline:
    1. Morphological fill + closing  → remove holes and small spurs
    2. find_contours                 → raw polygon points
    3. Spline smoothing              → smooth curves, fewer points
    """
    try:
        from skimage import measure
        from scipy.ndimage import binary_fill_holes, binary_closing

        # -- 1. Clean mask ---------------------------------------------------
        binary = mask_2d > 0.5
        binary = binary_fill_holes(binary)
        binary = binary_closing(binary, iterations=2)

        contours = measure.find_contours(binary.astype(np.float32), 0.5)
        result = []

        for c in contours:
            if len(c) < 6:
                continue

            pts_x = c[:, 1]   # col → x
            pts_y = c[:, 0]   # row → y

            # -- 3. Spline smoothing -----------------------------------------
            if len(c) >= 10:
                try:
                    from scipy.interpolate import splprep, splev
                    # Close the contour for periodic spline
                    cx = np.append(pts_x, pts_x[0])
                    cy = np.append(pts_y, pts_y[0])
                    n = len(cx)
                    # s controls smoothness (larger = smoother)
                    tck, _ = splprep([cx, cy], s=n * 2.0, per=True, k=3)
                    n_out = max(16, n // 4)
                    u_new = np.linspace(0, 1, n_out, endpoint=False)
                    xn, yn = splev(u_new, tck)
                    result.append([[round(float(x), 1), round(float(y), 1)]
                                   for x, y in zip(xn, yn)])
                    continue
                except Exception:
                    pass  # fall through to raw points

            result.append([[round(float(x), 1), round(float(y), 1)]
                           for x, y in zip(pts_x, pts_y)])

        return result

    except ImportError:
        # Fallback: simple bbox contour if skimage/scipy not available
        rows, cols = np.where(mask_2d > 0)
        if len(rows) == 0:
            return []
        r0, r1, c0, c1 = rows.min(), rows.max(), cols.min(), cols.max()
        return [[[float(c0), float(r0)], [float(c1), float(r0)],
                 [float(c1), float(r1)], [float(c0), float(r1)]]]


def build_atlas(ct_path: Path, merged_segs: dict, out_dir: Path):
    """Generate atlas PNG slices + JSON labels for all 3 planes."""
    import nibabel as nib

    print(f"\nBuilding atlas → {out_dir}")
    # Clean output directory to remove stale files from previous runs
    for sub in ["axial", "sagittal", "coronal", "labels"]:
        p = out_dir / sub
        if p.exists():
            shutil.rmtree(p)
    ct_img = nib.load(ct_path)
    ct_data = ct_img.get_fdata(dtype=np.float32)
    print(f"CT shape: {ct_data.shape}, voxel: {ct_img.header.get_zooms()}")

    # Crop to head region
    head_z_start = HEAD_Z_START
    head_z_end = min(HEAD_Z_END, ct_data.shape[2])
    ct_head = ct_data[:, :, head_z_start:head_z_end]
    print(f"Head crop: Z[{head_z_start}:{head_z_end}] → {ct_head.shape}")

    planes = {
        "axial":    (2, ct_head.shape[2]),
        "sagittal": (0, ct_head.shape[0]),
        "coronal":  (1, ct_head.shape[1]),
    }

    # Build structure list
    structures = []
    struct_by_name = {}
    for idx, name in enumerate(sorted(merged_segs.keys())):
        category = get_category(name)
        color = CATEGORY_COLORS.get(category, CATEGORY_COLORS["other"])
        s = {
            "id": idx,
            "name": name,
            "displayName": build_display_name(name),
            "category": category,
            "color": color,
            "bestSlice": {},
            "sliceRange": {},
        }
        structures.append(s)
        struct_by_name[name] = s

    # Process each plane
    for plane_name, (axis, n_slices) in planes.items():
        img_dir   = out_dir / plane_name
        label_dir = out_dir / "labels" / plane_name
        img_dir.mkdir(parents=True, exist_ok=True)
        label_dir.mkdir(parents=True, exist_ok=True)
        print(f"\n  Plane: {plane_name} ({n_slices} slices)...")

        # For each structure, compute its slice range in this plane
        struct_ranges = {}
        for name, (seg_full, _) in merged_segs.items():
            seg_head = seg_full[:, :, head_z_start:] if axis == 2 else seg_full
            if axis == 0:
                seg_head = seg_full
            elif axis == 1:
                seg_head = ct_data  # placeholder, will use correct below

        # Process slices
        for si in range(n_slices):
            # CT slice
            if axis == 0:
                ct_slice = ct_head[si, :, :]
            elif axis == 1:
                ct_slice = ct_head[:, si, :]
            else:
                ct_slice = ct_head[:, :, si]

            # Orient to standard display: transpose + flipud
            # RAS: axial (x,y)→(AP,LR), sagittal (y,z)→(SI,AP), coronal (x,z)→(SI,LR)
            ct_disp = np.flipud(ct_slice.T)

            # Save PNG
            img = ct_to_png_slice(ct_disp, WINDOW_CENTER, WINDOW_WIDTH)
            img_path = img_dir / f"{si:04d}.png"
            img.save(img_path)

            # Build labels for this slice
            slice_labels = []
            for name, (seg_full, _) in merged_segs.items():
                # Crop seg to head region
                if axis == 0:
                    seg_slice = seg_full[si, :, head_z_start:head_z_end]
                elif axis == 1:
                    seg_slice = seg_full[:, si, head_z_start:head_z_end]
                else:
                    seg_z = head_z_start + si
                    if seg_z >= head_z_end: continue
                    seg_slice = seg_full[:, :, seg_z]

                if seg_slice.max() < 0.5: continue

                # Same display transform applied to mask
                seg_slice = np.flipud(seg_slice.T)

                contours = mask_to_contours(seg_slice)
                if not contours: continue

                struct = struct_by_name.get(name)
                if struct:
                    slice_labels.append({
                        "id": struct["id"],
                        "name": name,
                        "contours": contours,
                    })
                    # Track slice range
                    if plane_name not in struct.setdefault("sliceRange", {}):
                        struct["sliceRange"][plane_name] = [si, si]
                    else:
                        struct["sliceRange"][plane_name][0] = min(struct["sliceRange"][plane_name][0], si)
                        struct["sliceRange"][plane_name][1] = max(struct["sliceRange"][plane_name][1], si)

            # Write label JSON
            label_path = label_dir / f"{si:04d}.json"
            with open(label_path, "w") as f:
                json.dump(slice_labels, f)

        # Compute bestSlice for each structure
        for s in structures:
            r = s.get("sliceRange", {}).get(plane_name)
            if r:
                s.setdefault("bestSlice", {})[plane_name] = (r[0] + r[1]) // 2
            else:
                s.setdefault("bestSlice", {})[plane_name] = n_slices // 2

        print(f"    Saved {n_slices} PNGs + labels")

    # Write info.json
    info = {
        "planes": {
            "axial":    {"slices": int(planes["axial"][1])},
            "sagittal": {"slices": int(planes["sagittal"][1])},
            "coronal":  {"slices": int(planes["coronal"][1])},
        },
        "window": {"center": WINDOW_CENTER, "width": WINDOW_WIDTH},
        "voxelSpacing": [VOXEL_TARGET, VOXEL_TARGET, VOXEL_TARGET],
    }
    with open(out_dir / "info.json", "w") as f:
        json.dump(info, f, indent=2)

    # Filter structures that appear in at least one plane
    active = [s for s in structures if s.get("sliceRange")]
    structures_out = {"totalStructures": len(active), "structures": active}
    with open(out_dir / "structures.json", "w") as f:
        json.dump(structures_out, f, indent=2)

    print(f"\nAtlas complete: {len(active)} structures, {out_dir}")


def build_display_name(name: str) -> dict:
    """Generate multilingual display names from TotalSegmentator structure name."""
    # Load translations from existing translate_structures.py data if available
    translations_path = PROJECT_ROOT / "scripts/translate_structures.py"
    en = name.replace("_", " ").title()
    # Basic Korean mapping rules
    ko = en  # fallback to English for now
    return {"en": en, "ko": ko, "ja": en, "zh": en, "es": en, "de": en, "fr": en}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--ct", type=Path, help="Path to head CT NIfTI (skips extraction)")
    parser.add_argument("--extract-only", action="store_true", help="Only extract CT, don't run TotalSegmentator")
    parser.add_argument("--build-only", action="store_true", help="Skip TotalSegmentator, build atlas from existing segs")
    parser.add_argument("--seg-dir", type=Path, help="Path to segmentation directory (overrides default)")
    parser.add_argument("--out", type=Path, default=OUT_DIR, help="Output directory")
    args = parser.parse_args()

    global SEG_DIR
    if args.seg_dir:
        SEG_DIR = args.seg_dir

    ct_path = args.ct or CT_PATH

    # Step 1: Extract CT
    if not args.build_only:
        if not ct_path.exists():
            if not extract_ct_from_zip():
                return
            ct_path = CT_PATH

    if args.extract_only:
        print(f"CT extracted: {ct_path}")
        return

    # Step 2: Run TotalSegmentator
    if not args.build_only:
        import torch
        vram_free = torch.cuda.mem_get_info()[0] // 1024 // 1024 if torch.cuda.is_available() else 0
        print(f"VRAM free: {vram_free}MB")
        if vram_free < 4000:
            print(f"WARNING: Only {vram_free}MB VRAM free.")
            print("Wait for other GPU processes to finish, then re-run.")
            ans = input("Continue anyway? [y/N] ")
            if ans.lower() != 'y':
                return
        run_totalsegmentator()

    # Step 3: Build atlas
    merged = merge_segmentations()
    if not merged:
        print("No segmentations found. Run TotalSegmentator first.")
        return

    build_atlas(ct_path, merged, args.out)
    print("\nDone. Next: npm run dev to verify the new head-ct atlas.")


if __name__ == "__main__":
    main()
