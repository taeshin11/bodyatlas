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
from _log_utils import Logger, Stage, install_excepthook
from gen_head_ct_atlas import (
    get_category, mask_to_contours, build_display_name, CATEGORY_COLORS
)

log = Logger("gen_our_ct", log_file=PROJECT_ROOT / "scripts" / "monitor_log.txt")
install_excepthook(log)


def load_segs_from_ts(case_dir: Path) -> dict:
    """Load all segmentations from a TotalSegmentator_v2 case directory."""
    import nibabel as nib

    seg_dir = case_dir / "segmentations"
    if not seg_dir.exists():
        log.fatal(f"no segmentations dir in {case_dir}", exc=False)
        raise FileNotFoundError(f"No segmentations dir in {case_dir}")

    files = sorted(seg_dir.glob("*.nii.gz"))
    log.info(f"scanning {len(files)} .nii.gz files in {seg_dir}")
    merged = {}
    skipped_empty = 0
    for f in files:
        name = f.stem.replace(".nii", "")
        try:
            img = nib.load(f)
            data = img.get_fdata(dtype=np.float32)
        except Exception:
            log.error(f"  failed to load {f.name}", exc=True)
            continue
        if data.max() > 0:
            merged[name] = (data, img.affine)
        else:
            skipped_empty += 1

    log.info(f"loaded {len(merged)} structures from {case_dir.name} (empty: {skipped_empty})")
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

    log.info(f"build_atlas -> {out_dir}")
    for sub in ["axial", "sagittal", "coronal", "labels"]:
        p = out_dir / sub
        if p.exists():
            shutil.rmtree(p)
    log.debug("cleaned existing plane subdirs")

    ct_img  = nib.load(ct_path)
    ct_data = ct_img.get_fdata(dtype=np.float32)
    spacing = ct_img.header.get_zooms()
    log.kv("CT shape", ct_data.shape)
    log.kv("spacing", tuple(round(float(s), 3) for s in spacing))
    log.kv("merged structures", len(merged))

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

    total_png = 0
    total_json = 0
    total_failed = 0

    for plane_name, (axis, n_slices) in planes.items():
        with Stage(log, f"render {plane_name} ({n_slices} slices)"):
            img_dir   = out_dir / plane_name
            label_dir = out_dir / "labels" / plane_name
            img_dir.mkdir(parents=True, exist_ok=True)
            label_dir.mkdir(parents=True, exist_ok=True)

            plane_png = 0
            plane_json = 0
            plane_failed = 0

            for si in range(n_slices):
                try:
                    if axis == 0:   ct_sl = ct_data[si, :, :]
                    elif axis == 1: ct_sl = ct_data[:, si, :]
                    else:           ct_sl = ct_data[:, :, si]

                    ct_disp = np.flipud(ct_sl.T)
                    ct_to_png_slice(ct_disp, WINDOW_CENTER, WINDOW_WIDTH).save(
                        img_dir / f"{si:04d}.png"
                    )
                    plane_png += 1

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
                    plane_json += 1
                except Exception:
                    plane_failed += 1
                    log.error(f"  {plane_name} slice {si} failed", exc=True)

            for s in structures:
                r = s["sliceRange"].get(plane_name)
                s["bestSlice"][plane_name] = (r[0] + r[1]) // 2 if r else n_slices // 2

            log.info(f"  {plane_name}: wrote {plane_png} PNG + {plane_json} JSON, failed={plane_failed}")
            total_png += plane_png
            total_json += plane_json
            total_failed += plane_failed

    info_path = out_dir / "info.json"
    structures_path = out_dir / "structures.json"
    info = {
        "planes": {p: {"slices": int(n)} for p, (_, n) in planes.items()},
        "window": {"center": WINDOW_CENTER, "width": WINDOW_WIDTH},
        "voxelSpacing": [round(float(s), 2) for s in spacing],
    }
    with open(info_path, "w") as f:
        json.dump(info, f, indent=2)
    log.debug(f"wrote {info_path}")

    active = [s for s in structures if s.get("sliceRange")]
    with open(structures_path, "w", encoding="utf-8") as f:
        json.dump({"totalStructures": len(active), "structures": active},
                  f, ensure_ascii=False)
    log.debug(f"wrote {structures_path} ({len(active)} active structures)")

    log.ok(
        f"atlas complete: {len(active)} structures, "
        f"{total_png} PNG + {total_json} JSON, failed={total_failed} -> {out_dir}"
    )


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--case", type=str, default="s0174",
                        help="TotalSegmentator_v2 case ID")
    parser.add_argument("--out", type=Path,
                        default=PROJECT_ROOT / "public/data/our-ct")
    args = parser.parse_args()

    log.banner("CT atlas builder (gen_our_ct_atlas)")
    log.kv("case", args.case)
    log.kv("output", args.out)

    case_dir = TS_BASE / args.case
    ct_path  = case_dir / "ct.nii.gz"

    if not ct_path.exists():
        log.fatal(f"CT source missing: {ct_path}", exc=False)
        return

    with Stage(log, "1/2 load segmentations"):
        merged = load_segs_from_ts(case_dir)
    with Stage(log, "2/2 build atlas"):
        build_atlas(ct_path, merged, args.out)

    log.banner("CT atlas builder complete")


if __name__ == "__main__":
    main()
