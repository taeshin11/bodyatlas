"""
gen_our_joint_xray_atlas.py

Binary-class joint X-ray atlas builder (hand / foot / chest).
Uses SPINAI predictor's 2-class models: {0: bg, 1: target}.

Source images: D:/ImageLabelAPI_SPINAI/data/anon/* (pre-anonymized).
Output: public/data/our-{modality}-xray/
License: Apache 2.0 (own models)

Usage
-----
    python scripts/gen_our_joint_xray_atlas.py --modality hand
    python scripts/gen_our_joint_xray_atlas.py --modality foot --max-cases 10
    python scripts/gen_our_joint_xray_atlas.py --modality hand --checkpoint <path>
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
sys.path.insert(0, str(Path(__file__).resolve().parent))
from _log_utils import Logger, Stage, install_excepthook

log = Logger("gen_our_joint_xray", log_file=PROJECT_ROOT / "scripts" / "monitor_log.txt")
install_excepthook(log)

TARGET_H = 900

# modality -> {sources: [Path, ...], default_ckpt, out_subdir}
MODALITY_CONFIG = {
    "hand": {
        "sources": [
            SPINAI_ROOT / "data" / "anon" / "rsna_hand_train",
        ],
        "default_ckpt": SPINAI_ROOT / "outputs" / "models" / "unet_hand_ANON_v3_c2_20260421" / "best_model.pth",
        "out_subdir": "our-hand-xray",
        "display_en": "Hand",
        "display_ko": "손",
    },
    "foot": {
        "sources": [
            SPINAI_ROOT / "data" / "anon" / "foot_fracatlas_leg",
            SPINAI_ROOT / "data" / "anon" / "foot_unifesp",
        ],
        "default_ckpt": SPINAI_ROOT / "outputs" / "models" / "unet_foot_ANON_v2_c2_20260421" / "best_model.pth",
        "out_subdir": "our-foot-xray",
        "display_en": "Foot",
        "display_ko": "발",
    },
}

CATEGORY_COLOR = {
    "hand": ("bone", "#F59E0B"),
    "foot": ("bone", "#EC4899"),
}


def mask_to_contours(mask: np.ndarray, min_area: int = 100, simplify_eps: float = 1.5):
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
            log.warn(f"source dir missing: {src}")
            continue
        n_before = len(cases)
        for ext in ("*.png", "*.jpg", "*.jpeg"):
            for img in sorted(src.glob(ext)):
                if "_mask" in img.name:
                    continue
                cases.append(img)
                if len(cases) >= max_cases:
                    log.debug(f"  reached max_cases={max_cases}")
                    return cases
        log.debug(f"  collected {len(cases) - n_before} from {src.name}")
    return cases


def run_inference(predictor, modality: str, img_path: Path, target_h: int):
    import cv2
    img_gray = cv2.imread(str(img_path), cv2.IMREAD_GRAYSCALE)
    if img_gray is None:
        log.error(f"cv2.imread returned None for {img_path}")
        return None, None, None
    orig_h, orig_w = img_gray.shape
    scale = target_h / orig_h
    new_w = round(orig_w * scale)
    log.debug(f"  inference: {img_path.name} {orig_w}x{orig_h} -> {new_w}x{target_h}")

    img_resized = cv2.resize(img_gray, (new_w, target_h), interpolation=cv2.INTER_LANCZOS4)

    result = predictor.predict(img_gray, modality)
    mask_orig = result["mask"]

    mask_resized = cv2.resize(mask_orig, (new_w, target_h), interpolation=cv2.INTER_NEAREST)
    return img_resized, mask_resized, (new_w, target_h)


def convert_case(predictor, modality: str, img_path: Path, out_img: Path, out_lbl: Path,
                 target_h: int, label_name: str):
    try:
        img_resized, mask_resized, dims = run_inference(predictor, modality, img_path, target_h)
    except Exception:
        log.error(f"run_inference crashed for {img_path}", exc=True)
        return None, False

    if img_resized is None:
        return None, False

    out_img.parent.mkdir(parents=True, exist_ok=True)
    Image.fromarray(img_resized).save(out_img, "PNG")

    contours = mask_to_contours(mask_resized)
    labels = []
    if contours:
        labels.append({"id": 0, "name": label_name, "contours": contours})

    out_lbl.parent.mkdir(parents=True, exist_ok=True)
    with open(out_lbl, "w") as f:
        json.dump(labels, f, separators=(",", ":"))

    return dims, bool(contours)


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--modality", choices=list(MODALITY_CONFIG), required=True)
    p.add_argument("--max-cases", type=int, default=10)
    p.add_argument("--out", type=Path, default=None)
    p.add_argument("--checkpoint", type=Path, default=None)
    args = p.parse_args()

    cfg = MODALITY_CONFIG[args.modality]
    out_dir = args.out or (PROJECT_ROOT / "public" / "data" / cfg["out_subdir"])
    ckpt = args.checkpoint or cfg["default_ckpt"]

    log.banner(f"{args.modality.upper()} X-ray atlas builder")
    log.kv("output", out_dir)
    log.kv("checkpoint", ckpt)
    log.kv("max_cases", args.max_cases)
    log.kv("target_h", TARGET_H)

    if not ckpt.exists():
        log.fatal(f"checkpoint missing: {ckpt}", exc=False)
        sys.exit(1)

    with Stage(log, "1/3 load predictor"):
        from inference.predictor import SpinAIPredictor
        predictor = SpinAIPredictor(checkpoints={args.modality: str(ckpt)})

    with Stage(log, "2/3 collect + inference"):
        cases = collect_cases(cfg["sources"], args.max_cases)
        log.info(f"collected {len(cases)} cases")
        if not cases:
            log.fatal("no cases found", exc=False)
            sys.exit(1)

        if out_dir.exists():
            for sub in ["ap", "lateral", "labels"]:
                d = out_dir / sub
                if d.exists():
                    shutil.rmtree(d)

        dims_final = (0, 0)
        n_with_mask = 0
        n_without = 0
        for i, img in enumerate(cases):
            out_img = out_dir / "ap" / f"{i:04d}.png"
            out_lbl = out_dir / "labels" / "ap" / f"{i:04d}.json"
            dims, has_mask = convert_case(
                predictor, args.modality, img, out_img, out_lbl, TARGET_H,
                label_name=args.modality,
            )
            if dims:
                dims_final = dims
                if has_mask:
                    n_with_mask += 1
                    log.info(f"  [{i:02d}] {img.name} -> mask OK")
                else:
                    n_without += 1
                    log.warn(f"  [{i:02d}] {img.name} -> empty mask")
            else:
                log.error(f"  [{i:02d}] {img.name} FAILED")

    with Stage(log, "3/3 write structures.json + info.json"):
        cat, color = CATEGORY_COLOR[args.modality]
        display_en = cfg["display_en"]
        display_ko = cfg["display_ko"]
        structures = [{
            "id": 0,
            "name": args.modality,
            "displayName": {
                "en": display_en, "ko": display_ko,
                "ja": display_en, "zh": display_en,
                "es": display_en, "de": display_en, "fr": display_en,
            },
            "category": cat,
            "color": color,
            "bestSlice": {"ap": 0},
            "sliceRange": {"ap": [0, max(0, len(cases) - 1)]},
        }]
        with open(out_dir / "structures.json", "w", encoding="utf-8") as f:
            json.dump({"totalStructures": len(structures), "structures": structures},
                      f, indent=2, ensure_ascii=False)

        info = {
            "modality": "X-Ray",
            "planes": {
                "ap": {"slices": len(cases), "width": dims_final[0], "height": dims_final[1]},
            },
        }
        with open(out_dir / "info.json", "w") as f:
            json.dump(info, f, indent=2)

    log.banner(
        f"{args.modality} atlas done: {len(cases)} cases "
        f"(with mask: {n_with_mask}, empty: {n_without})"
    )


if __name__ == "__main__":
    main()
