"""
gen_lumbar_mri_atlas.py

Generates a lumbar spine MRI atlas from SPIDER_lumbar dataset.
Uses T2-weighted sagittal MRI with vertebrae + disc segmentations.

Output: public/data/lumbar-mri/

Usage
-----
    python scripts/gen_lumbar_mri_atlas.py
    python scripts/gen_lumbar_mri_atlas.py --case 1
"""

import argparse
import json
import shutil
import sys
from pathlib import Path

import numpy as np

PROJECT_ROOT = Path(__file__).parent.parent
SPIDER_BASE = Path("D:/ImageLabelAPI_SPINAI/data/cat_F_opensource/SPIDER_lumbar")
OUT_DIR = PROJECT_ROOT / "public/data/lumbar-mri"

# SPIDER label map (standard)
SPIDER_LABELS = {
    1: "vertebra_L5",
    2: "vertebra_L4",
    3: "vertebra_L3",
    4: "vertebra_L2",
    5: "vertebra_L1",
    6: "vertebra_T12",
    7: "vertebra_sacrum",
    100: "spinal_canal",
    201: "disc_L5_S1",
    202: "disc_L4_L5",
    203: "disc_L3_L4",
    204: "disc_L2_L3",
    205: "disc_L1_L2",
    206: "disc_T12_L1",
    207: "disc_T11_T12",
}

DISPLAY_NAMES = {
    "vertebra_L5":    {"en": "L5 Vertebra",      "ko": "L5 요추"},
    "vertebra_L4":    {"en": "L4 Vertebra",      "ko": "L4 요추"},
    "vertebra_L3":    {"en": "L3 Vertebra",      "ko": "L3 요추"},
    "vertebra_L2":    {"en": "L2 Vertebra",      "ko": "L2 요추"},
    "vertebra_L1":    {"en": "L1 Vertebra",      "ko": "L1 요추"},
    "vertebra_T12":   {"en": "T12 Vertebra",     "ko": "T12 흉추"},
    "vertebra_sacrum": {"en": "Sacrum",           "ko": "천골"},
    "spinal_canal":   {"en": "Spinal Canal",     "ko": "척수관"},
    "disc_L5_S1":     {"en": "L5-S1 Disc",       "ko": "L5-S1 디스크"},
    "disc_L4_L5":     {"en": "L4-L5 Disc",       "ko": "L4-L5 디스크"},
    "disc_L3_L4":     {"en": "L3-L4 Disc",       "ko": "L3-L4 디스크"},
    "disc_L2_L3":     {"en": "L2-L3 Disc",       "ko": "L2-L3 디스크"},
    "disc_L1_L2":     {"en": "L1-L2 Disc",       "ko": "L1-L2 디스크"},
    "disc_T12_L1":    {"en": "T12-L1 Disc",      "ko": "T12-L1 디스크"},
    "disc_T11_T12":   {"en": "T11-T12 Disc",     "ko": "T11-T12 디스크"},
}

COLORS = {
    "vertebra_L5": "#3B82F6", "vertebra_L4": "#3B82F6", "vertebra_L3": "#3B82F6",
    "vertebra_L2": "#3B82F6", "vertebra_L1": "#3B82F6",
    "vertebra_T12": "#10B981", "vertebra_sacrum": "#8B5CF6",
    "spinal_canal": "#EF4444",
    "disc_L5_S1": "#F59E0B", "disc_L4_L5": "#F59E0B", "disc_L3_L4": "#F59E0B",
    "disc_L2_L3": "#F59E0B", "disc_L1_L2": "#F59E0B",
    "disc_T12_L1": "#F59E0B", "disc_T11_T12": "#F59E0B",
}

sys.path.insert(0, str(PROJECT_ROOT / "scripts"))
from gen_head_ct_atlas import mask_to_contours


def mri_to_png(sl: np.ndarray):
    """Normalize MRI slice to 0-255 grayscale using percentile windowing."""
    from PIL import Image
    # Use 1st-99th percentile for robust windowing
    p1, p99 = np.percentile(sl[sl > 0], [1, 99]) if sl.max() > 0 else (0, 1)
    arr = np.clip(sl, p1, p99)
    arr = ((arr - p1) / max(p99 - p1, 1) * 255).astype(np.uint8)
    return Image.fromarray(arr)


def build_atlas(case_id: str, out_dir: Path):
    import SimpleITK as sitk

    img_path = SPIDER_BASE / "images" / f"{case_id}_t2.mha"
    mask_path = SPIDER_BASE / "masks" / f"{case_id}_t2.mha"

    if not img_path.exists():
        print(f"Image not found: {img_path}")
        return
    if not mask_path.exists():
        print(f"Mask not found: {mask_path}")
        return

    print(f"Loading case {case_id}...")
    sitk_img = sitk.ReadImage(str(img_path))
    sitk_mask = sitk.ReadImage(str(mask_path))

    img_arr = sitk.GetArrayFromImage(sitk_img).astype(np.float32)
    mask_arr = sitk.GetArrayFromImage(sitk_mask).astype(np.int32)
    spacing = sitk_img.GetSpacing()

    print(f"Shape: {img_arr.shape}, Spacing: {spacing}")
    # Shape is (sagittal_slices, height, width) = (Z, Y, X) in SimpleITK

    # Clean output
    for sub in ["sagittal", "axial", "coronal", "labels"]:
        p = out_dir / sub
        if p.exists():
            shutil.rmtree(p)

    # SPIDER is sagittal-oriented: axis 2 (last) is sagittal
    # img_arr shape = (n_sag, h, w) from SimpleITK
    n_sag = img_arr.shape[2]  # sagittal slices
    n_ax = img_arr.shape[0]   # "axial-ish"
    n_cor = img_arr.shape[1]  # coronal

    planes = {
        "sagittal": (2, n_sag),
        "axial":    (0, n_ax),
        "coronal":  (1, n_cor),
    }

    # Build structure list from labels actually present
    present_labels = set(np.unique(mask_arr)) - {0}
    structures = []
    struct_by_label = {}
    for idx, (label_id, name) in enumerate(sorted(SPIDER_LABELS.items())):
        if label_id not in present_labels:
            continue
        dn = DISPLAY_NAMES.get(name, {"en": name, "ko": name})
        display = {lang: dn.get(lang, dn["en"]) for lang in ["en", "ko", "ja", "zh", "es", "de", "fr"]}
        cat = "bone" if "vertebra" in name else ("cavity" if "canal" in name else "other")
        s = {
            "id": len(structures), "name": name,
            "displayName": display,
            "category": cat,
            "color": COLORS.get(name, "#94A3B8"),
            "bestSlice": {}, "sliceRange": {},
        }
        structures.append(s)
        struct_by_label[label_id] = s

    print(f"Active structures: {len(structures)}")

    for plane_name, (axis, n_slices) in planes.items():
        img_dir = out_dir / plane_name
        label_dir = out_dir / "labels" / plane_name
        img_dir.mkdir(parents=True, exist_ok=True)
        label_dir.mkdir(parents=True, exist_ok=True)
        print(f"  {plane_name}: {n_slices} slices...")

        for si in range(n_slices):
            if axis == 0:
                mri_sl = img_arr[si, :, :]
                msk_sl = mask_arr[si, :, :]
            elif axis == 1:
                mri_sl = img_arr[:, si, :]
                msk_sl = mask_arr[:, si, :]
            else:
                mri_sl = img_arr[:, :, si]
                msk_sl = mask_arr[:, :, si]

            # Display: flip for standard orientation
            mri_disp = np.flipud(mri_sl)
            msk_disp = np.flipud(msk_sl)

            mri_to_png(mri_disp).save(img_dir / f"{si:04d}.png")

            slice_labels = []
            for label_id, struct in struct_by_label.items():
                binary = (msk_disp == label_id).astype(np.uint8)
                if binary.max() == 0:
                    continue
                contours = mask_to_contours(binary)
                if not contours:
                    continue
                slice_labels.append({
                    "id": struct["id"], "name": struct["name"], "contours": contours
                })
                r = struct["sliceRange"].setdefault(plane_name, [si, si])
                r[0] = min(r[0], si)
                r[1] = max(r[1], si)

            with open(label_dir / f"{si:04d}.json", "w") as f:
                json.dump(slice_labels, f)

        for s in structures:
            r = s["sliceRange"].get(plane_name)
            s["bestSlice"][plane_name] = (r[0] + r[1]) // 2 if r else n_slices // 2

    # Write info.json
    info = {
        "planes": {p: {"slices": int(n)} for p, (_, n) in planes.items()},
        "window": {"center": 0, "width": 0},
        "voxelSpacing": [round(float(s), 2) for s in spacing],
    }
    with open(out_dir / "info.json", "w") as f:
        json.dump(info, f, indent=2)

    # Write structures.json
    active = [s for s in structures if s.get("sliceRange")]
    with open(out_dir / "structures.json", "w", encoding="utf-8") as f:
        json.dump({"totalStructures": len(active), "structures": active},
                  f, ensure_ascii=False)

    print(f"\nAtlas complete: {len(active)} structures -> {out_dir}")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--case", type=str, default="1")
    parser.add_argument("--out", type=Path, default=OUT_DIR)
    args = parser.parse_args()

    build_atlas(args.case, args.out)
    print("Done.")


if __name__ == "__main__":
    main()
