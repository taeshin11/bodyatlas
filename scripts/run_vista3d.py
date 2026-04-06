"""
run_vista3d.py

Runs VISTA3D inference via the MONAI bundle runner and splits the
multi-class output into one .nii.gz per structure (TotalSegmentator layout).

Usage
-----
    # Use vista3d conda env:
    python scripts/run_vista3d.py
    python scripts/run_vista3d.py --ct path/to/ct.nii.gz --out data_pipeline/vista3d_seg/

Requirements
-------------
    conda activate vista3d   (or equivalent env with MONAI 1.4+)
"""

import argparse
import subprocess
import sys
import tempfile
import json
from pathlib import Path

import nibabel as nib
import numpy as np

# ── Paths ────────────────────────────────────────────────────────────────────
BUNDLE_DIR   = Path(__file__).parent.parent / "data_pipeline/vista3d_bundle/vista3d"
DEFAULT_CT   = Path("D:/ImageLabelAPI_SPINAI/data/cat_F_opensource/TotalSegmentator_v2/s0011/ct.nii.gz")
DEFAULT_OUT  = Path(__file__).parent.parent / "data_pipeline/vista3d_seg"

# VISTA3D label index → structure name (classes 1-127 from MONAI bundle metadata)
VISTA3D_LABELS = {
    1: "spleen", 2: "right_kidney", 3: "left_kidney", 4: "gallbladder",
    5: "esophagus", 6: "liver", 7: "stomach", 8: "aorta",
    9: "inferior_vena_cava", 10: "portal_vein_and_splenic_vein",
    11: "pancreas", 12: "right_adrenal_gland", 13: "left_adrenal_gland",
    14: "duodenum", 15: "hepatic_vessel",
    16: "right_lung_upper_lobe", 17: "right_lung_middle_lobe",
    18: "right_lung_lower_lobe", 19: "left_lung_upper_lobe",
    20: "left_lung_lower_lobe",
    23: "trachea", 24: "brain", 25: "thyroid_gland",
    26: "small_bowel", 27: "colon", 28: "urinary_bladder",
    30: "sacrum",
    31: "vertebrae_S1", 32: "vertebrae_L5", 33: "vertebrae_L4",
    34: "vertebrae_L3", 35: "vertebrae_L2", 36: "vertebrae_L1",
    37: "vertebrae_T12", 38: "vertebrae_T11", 39: "vertebrae_T10",
    40: "vertebrae_T9", 41: "vertebrae_T8", 42: "vertebrae_T7",
    43: "vertebrae_T6", 44: "vertebrae_T5", 45: "vertebrae_T4",
    46: "vertebrae_T3", 47: "vertebrae_T2", 48: "vertebrae_T1",
    49: "vertebrae_C7", 50: "vertebrae_C6", 51: "vertebrae_C5",
    52: "vertebrae_C4", 53: "vertebrae_C3", 54: "vertebrae_C2",
    55: "vertebrae_C1",
    59: "spinal_cord",
    60: "heart_myocardium", 61: "heart_atrium_left", 62: "heart_atrium_right",
    63: "heart_ventricle_left", 64: "heart_ventricle_right",
    65: "pulmonary_artery",
    67: "iliac_artery_left", 68: "iliac_artery_right",
    69: "iliac_vena_left", 70: "iliac_vena_right",
    75: "gluteus_maximus_left", 76: "gluteus_maximus_right",
    77: "gluteus_medius_left", 78: "gluteus_medius_right",
    81: "autochthon_left", 82: "autochthon_right",
    83: "iliopsoas_left", 84: "iliopsoas_right",
    87: "sternum", 88: "costal_cartilages",
    99: "airway", 100: "skull",
    101: "rib_right_1", 102: "rib_right_2", 103: "rib_right_3",
    104: "rib_right_4", 105: "rib_right_5", 106: "rib_right_6",
    107: "rib_right_7", 108: "rib_right_8", 109: "rib_right_9",
    110: "rib_right_10", 111: "rib_right_11", 112: "rib_right_12",
    113: "rib_left_1", 114: "rib_left_2", 115: "rib_left_3",
    116: "rib_left_4", 117: "rib_left_5", 118: "rib_left_6",
    119: "rib_left_7", 120: "rib_left_8", 121: "rib_left_9",
    122: "rib_left_10", 123: "rib_left_11", 124: "rib_left_12",
}


def run_bundle_inference(ct_path: Path, raw_out_dir: Path) -> Path:
    """Run VISTA3D via monai.bundle command line and return output nii path."""
    raw_out_dir.mkdir(parents=True, exist_ok=True)

    # everything_labels: 1-127 (skip classes with sub-types: 2,16,18,20,21,23,24,25,26,27)
    everything_labels = list(set(range(1, 128)) - {2, 16, 18, 20, 21, 23, 24, 25, 26, 27})

    input_dict = json.dumps({
        "image": str(ct_path).replace("\\", "/"),
        "label_prompt": everything_labels,
    })

    cmd = [
        sys.executable, "-m", "monai.bundle", "run",
        "--config_file",  str(BUNDLE_DIR / "configs/inference.json"),
        "--bundle_root",  str(BUNDLE_DIR),
        "--input_dict",   input_dict,
        "--output_dir",   str(raw_out_dir),
        "--output_ext",   ".nii.gz",
        "--output_postfix", "seg",
    ]

    print("Running VISTA3D bundle inference...")
    print("CMD:", " ".join(cmd[:6]), "...")
    # Run from bundle root so that `scripts.inferer` resolves correctly
    env = dict(__import__("os").environ)
    env["PYTHONPATH"] = str(BUNDLE_DIR) + __import__("os").pathsep + env.get("PYTHONPATH", "")
    result = subprocess.run(cmd, capture_output=False, text=True,
                            cwd=str(BUNDLE_DIR), env=env)
    if result.returncode != 0:
        raise RuntimeError(f"VISTA3D inference failed (exit {result.returncode})")

    # Find output file
    out_files = list(raw_out_dir.rglob("*.nii.gz"))
    if not out_files:
        raise FileNotFoundError(f"No output .nii.gz found in {raw_out_dir}")
    return out_files[0]


def split_to_per_structure(seg_path: Path, out_dir: Path):
    """Split multi-label segmentation into one .nii.gz per structure."""
    out_dir.mkdir(parents=True, exist_ok=True)
    img   = nib.load(seg_path)
    data  = img.get_fdata(dtype=np.float32)
    print(f"Segmentation shape: {data.shape}, unique labels: {np.unique(data).astype(int)}")

    saved = 0
    for label_idx, name in VISTA3D_LABELS.items():
        mask = (data == label_idx).astype(np.uint8)
        if mask.max() == 0:
            continue
        nib.save(nib.Nifti1Image(mask, img.affine), out_dir / f"{name}.nii.gz")
        saved += 1

    print(f"Saved {saved} per-structure files to {out_dir}")
    return saved


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--ct",  type=Path, default=DEFAULT_CT)
    parser.add_argument("--out", type=Path, default=DEFAULT_OUT)
    parser.add_argument("--skip-inference", action="store_true",
                        help="Skip inference, only split existing output")
    args = parser.parse_args()

    raw_out = args.out.parent / "vista3d_raw"

    if not args.skip_inference:
        seg_path = run_bundle_inference(args.ct, raw_out)
        print(f"Raw segmentation: {seg_path}")
    else:
        candidates = list(raw_out.rglob("*.nii.gz"))
        if not candidates:
            print("No raw segmentation found. Run without --skip-inference first.")
            return
        seg_path = candidates[0]
        print(f"Using existing: {seg_path}")

    split_to_per_structure(seg_path, args.out)
    print("\nDone. Use gen_head_ct_atlas.py --seg-dir to rebuild atlas.")


if __name__ == "__main__":
    main()
