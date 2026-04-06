"""
smooth_labels.py

Post-processes existing JSON contour label files (public/data/*/labels/)
by applying spline smoothing + morphological reasoning to the 2D point lists.

This is a non-destructive improvement: it reads the existing JSON contours
and writes smoother versions back in-place.

Usage
-----
    # Smooth all atlases
    python scripts/smooth_labels.py

    # Smooth specific atlas
    python scripts/smooth_labels.py --atlas brain-mri
    python scripts/smooth_labels.py --atlas chest-ct
    python scripts/smooth_labels.py --atlas head-ct

Requirements
------------
    pip install scipy numpy
"""

import argparse
import json
import os
from pathlib import Path

import numpy as np

PROJECT_ROOT = Path(__file__).parent.parent
DATA_DIR     = PROJECT_ROOT / "public/data"

ATLASES = ["brain-mri", "chest-ct", "head-ct", "spine-xray"]


def smooth_contour_points(pts: list) -> list:
    """Smooth a list of [x, y] contour points using a periodic spline.

    Returns a (possibly shorter) list of smoothed [x, y] points.
    Falls back to original points if smoothing fails.
    """
    if len(pts) < 10:
        return pts

    try:
        from scipy.interpolate import splprep, splev

        arr  = np.array(pts, dtype=float)
        xs   = arr[:, 0]
        ys   = arr[:, 1]

        # Close the contour
        xs = np.append(xs, xs[0])
        ys = np.append(ys, ys[0])
        n  = len(xs)

        tck, _ = splprep([xs, ys], s=n * 2.0, per=True, k=3)
        n_out  = max(16, n // 4)
        u_new  = np.linspace(0, 1, n_out, endpoint=False)
        xn, yn = splev(u_new, tck)

        return [[round(float(x), 1), round(float(y), 1)] for x, y in zip(xn, yn)]

    except Exception:
        return pts


def smooth_label_file(path: Path) -> bool:
    """Load a label JSON, smooth all contours, write back. Returns True if changed."""
    with open(path, encoding="utf-8") as f:
        data = json.load(f)

    if not data:
        return False

    changed = False
    for struct in data:
        new_contours = []
        for contour in struct.get("contours", []):
            smoothed = smooth_contour_points(contour)
            new_contours.append(smoothed)
            if smoothed is not contour:
                changed = True
        struct["contours"] = new_contours

    if changed:
        with open(path, "w", encoding="utf-8") as f:
            json.dump(data, f)

    return changed


def smooth_atlas(atlas_name: str):
    atlas_dir = DATA_DIR / atlas_name / "labels"
    if not atlas_dir.exists():
        print(f"  No labels dir: {atlas_dir}")
        return

    planes = [p for p in atlas_dir.iterdir() if p.is_dir()]
    total_files  = 0
    total_changed = 0

    for plane_dir in sorted(planes):
        files = sorted(plane_dir.glob("*.json"))
        n_changed = 0
        for f in files:
            if smooth_label_file(f):
                n_changed += 1
        total_files   += len(files)
        total_changed += n_changed
        print(f"    {plane_dir.name}: {len(files)} files, {n_changed} changed")

    print(f"  {atlas_name}: {total_changed}/{total_files} label files updated")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--atlas", choices=ATLASES, default=None,
                        help="Which atlas to smooth (default: all)")
    args = parser.parse_args()

    targets = [args.atlas] if args.atlas else ATLASES

    for atlas in targets:
        print(f"\nSmoothing {atlas}...")
        smooth_atlas(atlas)

    print("\nDone. Commit and redeploy.")


if __name__ == "__main__":
    main()
