"""
gen_our_xray_atlas.py

Generates "SPINAI X-ray" atlas from unet_xray_c34 model predictions.
34-class segmentation (C1-L5 vertebrae, sacrum, iliac, femur, pedicles, etc.)

Output: public/data/our-xray/
License: Apache 2.0 (own model)

Usage
-----
    python scripts/gen_our_xray_atlas.py
    python scripts/gen_our_xray_atlas.py --max-cases 10
"""
import argparse
import json
import shutil
import sys
from pathlib import Path

import numpy as np
from PIL import Image

PROJECT_ROOT = Path(__file__).resolve().parent.parent
SPINAI_ROOT = Path("D:/ImageLabelAPI_SPINAI")
sys.path.insert(0, str(SPINAI_ROOT / "src"))

AP_SOURCES = [
    SPINAI_ROOT / "data" / "cat_A_ap_xray" / "0006_scoliosis_labeled",
]
LAT_SOURCES = [
    SPINAI_ROOT / "data" / "cat_B_lat_xray" / "Lat_labeled" / "0_Lat_Lxray_label_no_VCF",
]

OUT_DIR = PROJECT_ROOT / "public" / "data" / "our-xray"
TARGET_H = 900

CHECKPOINT_XRAY = SPINAI_ROOT / "outputs" / "models" / "unet_xray_c34_20260412_154159" / "best_model.pth"

CATEGORY_MAP = {
    **{v: ("bone", "#3B82F6") for v in ["C1","C2","C3","C4","C5","C6","C7"]},
    **{v: ("bone", "#10B981") for v in ["T1","T2","T3","T4","T5","T6","T7","T8","T9","T10","T11","T12"]},
    **{v: ("bone", "#F59E0B") for v in ["L1","L2","L3","L4","L5"]},
    "S1":     ("bone", "#8B5CF6"),
    "sacrum": ("bone", "#8B5CF6"),
    "iliac":  ("bone", "#EC4899"),
    "femur":  ("bone", "#F97316"),
    "pedicle":          ("bone", "#60A5FA"),
    "spinous_process":  ("bone", "#A78BFA"),
    "transverse_process": ("bone", "#34D399"),
    "disc_canal":       ("other", "#64748B"),
    "spine_other":      ("other", "#94A3B8"),
}

DISPLAY_NAMES = {
    **{v: {"en": f"{v} Vertebra", "ko": f"{v} 척추"} for v in [
        "C1","C2","C3","C4","C5","C6","C7",
        "T1","T2","T3","T4","T5","T6","T7","T8","T9","T10","T11","T12",
        "L1","L2","L3","L4","L5","S1"]},
    "sacrum": {"en": "Sacrum", "ko": "천골"},
    "iliac":  {"en": "Iliac",  "ko": "장골"},
    "femur":  {"en": "Femur",  "ko": "대퇴골"},
    "pedicle": {"en": "Pedicle", "ko": "척추경"},
    "spinous_process":   {"en": "Spinous Process",   "ko": "극돌기"},
    "transverse_process":{"en": "Transverse Process","ko": "횡돌기"},
    "disc_canal":  {"en": "Disc/Canal",  "ko": "디스크/척추관"},
    "spine_other": {"en": "Spine Other", "ko": "기타 척추"},
}


def mask_to_contours(mask: np.ndarray, min_area: int = 20, simplify_eps: float = 1.0):
    """Extract polygon contours from binary mask."""
    import cv2
    binary = (mask > 0).astype(np.uint8) * 255
    contours, _ = cv2.findContours(binary, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    polys = []
    for c in contours:
        if cv2.contourArea(c) < min_area:
            continue
        simp = cv2.approxPolyDP(c, simplify_eps, True)
        pts = simp.reshape(-1, 2).tolist()
        if len(pts) >= 3:
            polys.append([[round(x, 1), round(y, 1)] for x, y in pts])
    return polys


def collect_cases(sources, max_cases: int):
    cases = []
    for src in sources:
        if not src.exists():
            print(f"  SKIP {src}")
            continue
        for ext in ("*.jpg", "*.png"):
            for img in sorted(src.glob(ext)):
                if "_mask" in img.name:
                    continue
                cases.append(img)
                if len(cases) >= max_cases:
                    return cases
    return cases


def run_inference(predictor, img_path: Path, target_h: int):
    """Run unet_xray_c34 inference, return (resized_image, class_mask_at_target_size)."""
    import cv2

    img_gray = cv2.imread(str(img_path), cv2.IMREAD_GRAYSCALE)
    if img_gray is None:
        return None, None, None, None
    orig_h, orig_w = img_gray.shape
    scale = target_h / orig_h
    new_w = round(orig_w * scale)

    img_resized = cv2.resize(img_gray, (new_w, target_h), interpolation=cv2.INTER_LANCZOS4)

    result = predictor.predict(img_gray, "xray")
    mask_orig = result["mask"]
    class_names = result["class_names"]

    mask_resized = cv2.resize(mask_orig, (new_w, target_h), interpolation=cv2.INTER_NEAREST)

    return img_resized, mask_resized, class_names, (new_w, target_h)


def convert_case(predictor, img_path: Path, out_img: Path, out_lbl: Path, target_h: int):
    img_resized, mask_resized, class_names, dims = run_inference(predictor, img_path, target_h)
    if img_resized is None:
        return None, set()

    out_img.parent.mkdir(parents=True, exist_ok=True)
    Image.fromarray(img_resized).save(out_img, "PNG")

    unique = np.unique(mask_resized)
    labels = []
    seen_names = set()
    for cid in unique:
        if cid == 0:
            continue
        name = class_names.get(int(cid))
        if not name or name == "background":
            continue
        binary = (mask_resized == cid).astype(np.uint8)
        contours = mask_to_contours(binary)
        if not contours:
            continue
        labels.append({"id": -1, "name": name, "contours": contours})
        seen_names.add(name)

    out_lbl.parent.mkdir(parents=True, exist_ok=True)
    with open(out_lbl, "w") as f:
        json.dump(labels, f, separators=(",", ":"))

    return dims, seen_names


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--max-cases", type=int, default=10)
    parser.add_argument("--out", type=Path, default=OUT_DIR)
    parser.add_argument("--checkpoint", type=Path, default=CHECKPOINT_XRAY)
    args = parser.parse_args()

    print(f"Output: {args.out}")
    print(f"Checkpoint: {args.checkpoint}")
    if not args.checkpoint.exists():
        print(f"[FAIL] Checkpoint missing: {args.checkpoint}")
        sys.exit(1)

    from inference.predictor import SpinAIPredictor
    predictor = SpinAIPredictor(checkpoints={"xray": str(args.checkpoint)})

    print("\nCollecting AP cases...")
    ap_cases = collect_cases(AP_SOURCES, args.max_cases)
    print(f"  Found {len(ap_cases)}")
    print("Collecting Lat cases...")
    lat_cases = collect_cases(LAT_SOURCES, args.max_cases)
    print(f"  Found {len(lat_cases)}")

    if not ap_cases and not lat_cases:
        print("No cases found!")
        sys.exit(1)

    for sub in ["ap", "lateral", "labels"]:
        d = args.out / sub
        if d.exists():
            shutil.rmtree(d)

    all_names = set()
    ap_dims = (0, 0)
    lat_dims = (0, 0)

    print("\nRunning AP inference...")
    for i, img in enumerate(ap_cases):
        out_img = args.out / "ap" / f"{i:04d}.png"
        out_lbl = args.out / "labels" / "ap" / f"{i:04d}.json"
        dims, names = convert_case(predictor, img, out_img, out_lbl, TARGET_H)
        if dims:
            ap_dims = dims
            all_names.update(names)
            print(f"  [AP {i}] {img.name} -> {len(names)} classes")

    print("\nRunning Lateral inference...")
    for i, img in enumerate(lat_cases):
        out_img = args.out / "lateral" / f"{i:04d}.png"
        out_lbl = args.out / "labels" / "lateral" / f"{i:04d}.json"
        dims, names = convert_case(predictor, img, out_img, out_lbl, TARGET_H)
        if dims:
            lat_dims = dims
            all_names.update(names)
            print(f"  [LAT {i}] {img.name} -> {len(names)} classes")

    # Build structures.json
    sorted_names = sorted(all_names)
    structures = []
    for idx, name in enumerate(sorted_names):
        cat, color = CATEGORY_MAP.get(name, ("other", "#64748B"))
        dn = DISPLAY_NAMES.get(name, {"en": name.replace("_", " ").title(), "ko": name.replace("_", " ")})
        display = {lang: dn.get(lang, dn["en"]) for lang in ["en","ko","ja","zh","es","de","fr"]}
        structures.append({
            "id": idx,
            "name": name,
            "displayName": display,
            "category": cat,
            "color": color,
            "bestSlice": {"ap": 0, "lateral": 0},
            "sliceRange": {
                "ap": [0, max(0, len(ap_cases) - 1)],
                "lateral": [0, max(0, len(lat_cases) - 1)],
            },
        })

    # Assign correct IDs in label JSONs
    name_to_id = {s["name"]: s["id"] for s in structures}
    for jp in sorted((args.out / "labels").rglob("*.json")):
        with open(jp) as f:
            labels = json.load(f)
        for label in labels:
            label["id"] = name_to_id.get(label["name"], -1)
        with open(jp, "w") as f:
            json.dump(labels, f, separators=(",", ":"))

    with open(args.out / "structures.json", "w", encoding="utf-8") as f:
        json.dump({"totalStructures": len(structures), "structures": structures},
                  f, indent=2, ensure_ascii=False)

    info = {
        "modality": "X-Ray",
        "planes": {
            "ap":      {"slices": len(ap_cases), "width": ap_dims[0], "height": ap_dims[1]},
            "lateral": {"slices": len(lat_cases), "width": lat_dims[0], "height": lat_dims[1]},
        },
    }
    with open(args.out / "info.json", "w") as f:
        json.dump(info, f, indent=2)

    print(f"\nDone! AP: {len(ap_cases)}, Lateral: {len(lat_cases)}")
    print(f"Structures: {len(structures)}")


if __name__ == "__main__":
    main()
