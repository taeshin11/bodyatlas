"""
gen_spine_xray_atlas.py

Converts ImageLabelAPI_SPINAI spine X-ray annotations (LabelImg v0.3.3 polygon JSON)
into BodyAtlas web format (PNG slices + per-slice label JSON + structures.json).

Multiple cases are exposed as "slices" so the existing AtlasViewer slider works.

Usage
-----
    python scripts/gen_spine_xray_atlas.py
    python scripts/gen_spine_xray_atlas.py --max-cases 20
"""

import argparse
import json
import shutil
from pathlib import Path
from PIL import Image

# ── Source data paths ─────────────────────────────────────────────────────────
AP_SOURCES = [
    Path("D:/ImageLabelAPI_SPINAI/PSH"),
    Path("D:/ImageLabelAPI_SPINAI/0006_AP_Lxray_label_Scoliosis/segmentation_labeled"),
]

LAT_SOURCES = [
    Path("D:/ImageLabelAPI_SPINAI/Lat/0005_Lat_Lxray_label/0_Lat_Lxray_label_no_VCF"),
]

OUT_DIR = Path(__file__).parent.parent / "public/data/spine-xray"

# Target display height (width scales proportionally)
TARGET_H = 900

# ── Structure definitions ─────────────────────────────────────────────────────
CATEGORY_MAP = {
    # Vertebral bodies
    **{v: ("bone", "#3B82F6") for v in ["L1","L2","L3","L4","L5"]},
    **{v: ("bone", "#10B981") for v in ["T5","T6","T7","T8","T9","T10","T11","T12"]},
    "S1": ("bone", "#8B5CF6"),
    # Landmarks
    "sacrum": ("bone", "#8B5CF6"), "sacrum_lat": ("bone", "#8B5CF6"),
    "femur_lt": ("bone", "#F59E0B"), "femur_rt": ("bone", "#F59E0B"),
    "iliac_crest_lt": ("bone", "#EC4899"), "iliac_crest_rt": ("bone", "#EC4899"),
    "rib": ("bone", "#94A3B8"),
    # Pedicles
    **{f"pedicle_{v}_{s}": ("bone", "#60A5FA")
       for v in ["T5","T6","T7","T8","T9","T10","T11","T12","L1","L2","L3","L4","L5","S1"]
       for s in ["lt","rt"]},
    # Transverse processes
    **{f"transverse_{v}_{s}": ("bone", "#34D399")
       for v in ["L1","L2","L3","L4","L5"]
       for s in ["lt","rt"]},
    # Spinous processes
    **{f"spinous_{v}": ("bone", "#A78BFA")
       for v in ["T5","T6","T7","T8","T9","T10","T11","T12","L1","L2","L3","L4","L5"]},
    # Lat-specific
    "spine_outline_lat": ("other", "#64748B"),
    "aortic_calcification": ("vessel", "#EF4444"),
}

DISPLAY_NAMES = {
    "L1": {"en": "L1 Vertebra", "ko": "L1 요추"},
    "L2": {"en": "L2 Vertebra", "ko": "L2 요추"},
    "L3": {"en": "L3 Vertebra", "ko": "L3 요추"},
    "L4": {"en": "L4 Vertebra", "ko": "L4 요추"},
    "L5": {"en": "L5 Vertebra", "ko": "L5 요추"},
    "T5":  {"en": "T5 Vertebra",  "ko": "T5 흉추"},
    "T6":  {"en": "T6 Vertebra",  "ko": "T6 흉추"},
    "T7":  {"en": "T7 Vertebra",  "ko": "T7 흉추"},
    "T8":  {"en": "T8 Vertebra",  "ko": "T8 흉추"},
    "T9":  {"en": "T9 Vertebra",  "ko": "T9 흉추"},
    "T10": {"en": "T10 Vertebra", "ko": "T10 흉추"},
    "T11": {"en": "T11 Vertebra", "ko": "T11 흉추"},
    "T12": {"en": "T12 Vertebra", "ko": "T12 흉추"},
    "S1":  {"en": "S1 (Sacrum)",  "ko": "S1 (천추)"},
    "sacrum": {"en": "Sacrum", "ko": "천골"},
    "sacrum_lat": {"en": "Sacrum", "ko": "천골"},
    "femur_lt": {"en": "Left Femur", "ko": "좌측 대퇴골"},
    "femur_rt": {"en": "Right Femur", "ko": "우측 대퇴골"},
    "iliac_crest_lt": {"en": "Left Iliac Crest", "ko": "좌측 장골능"},
    "iliac_crest_rt": {"en": "Right Iliac Crest", "ko": "우측 장골능"},
    "rib": {"en": "Rib", "ko": "늑골"},
    "spine_outline_lat": {"en": "Spine Outline", "ko": "척추 윤곽"},
    "aortic_calcification": {"en": "Aortic Calcification", "ko": "대동맥 석회화"},
}

# Auto-generate pedicle/transverse/spinous display names
for v in ["T5","T6","T7","T8","T9","T10","T11","T12","L1","L2","L3","L4","L5","S1"]:
    for s, sko, sen in [("lt", "좌", "Left"), ("rt", "우", "Right")]:
        DISPLAY_NAMES[f"pedicle_{v}_{s}"] = {"en": f"{v} Pedicle {sen}", "ko": f"{v} {sko}측 척추경"}
for v in ["L1","L2","L3","L4","L5"]:
    for s, sko, sen in [("lt", "좌", "Left"), ("rt", "우", "Right")]:
        DISPLAY_NAMES[f"transverse_{v}_{s}"] = {"en": f"{v} Transverse Process {sen}", "ko": f"{v} {sko}측 횡돌기"}
for v in ["T5","T6","T7","T8","T9","T10","T11","T12","L1","L2","L3","L4","L5"]:
    DISPLAY_NAMES[f"spinous_{v}"] = {"en": f"{v} Spinous Process", "ko": f"{v} 극돌기"}


def collect_cases(sources, max_cases):
    """Find (image_path, json_path) pairs from source directories."""
    cases = []
    for src in sources:
        if not src.exists():
            print(f"  SKIP {src} (not found)")
            continue
        jsons = sorted(src.glob("*.json"))
        for jp in jsons:
            # Try jpg first, then png
            img = jp.with_suffix(".jpg")
            if not img.exists():
                img = jp.with_suffix(".png")
            if not img.exists():
                continue
            # Quick sanity: must have shapes
            try:
                with open(jp) as f:
                    d = json.load(f)
                if len(d.get("shapes", [])) < 3:
                    continue
            except Exception:
                continue
            cases.append((img, jp))
            if len(cases) >= max_cases:
                return cases
    return cases


def convert_case(img_path, json_path, out_img_path, out_label_path, target_h):
    """Convert one case: resize image to target_h, scale polygon coordinates."""
    img = Image.open(img_path)
    orig_w, orig_h = img.size
    scale = target_h / orig_h
    new_w = round(orig_w * scale)

    # Resize and save as grayscale PNG
    img_resized = img.resize((new_w, target_h), Image.LANCZOS)
    if img_resized.mode != "L":
        img_resized = img_resized.convert("L")
    out_img_path.parent.mkdir(parents=True, exist_ok=True)
    img_resized.save(out_img_path, "PNG")

    # Load annotation and scale coordinates
    with open(json_path, encoding="utf-8") as f:
        ann = json.load(f)

    # Group by label (e.g. multiple "rib" polygons)
    label_groups = {}
    for shape in ann.get("shapes", []):
        name = shape["label"]
        pts = [[round(p[0] * scale, 1), round(p[1] * scale, 1)] for p in shape["points"]]
        if len(pts) < 3:
            continue
        if name not in label_groups:
            label_groups[name] = []
        label_groups[name].append(pts)

    labels = [{"id": -1, "name": name, "contours": contours}
              for name, contours in label_groups.items()]

    out_label_path.parent.mkdir(parents=True, exist_ok=True)
    with open(out_label_path, "w") as f:
        json.dump(labels, f, separators=(",", ":"))

    return new_w, target_h, set(label_groups.keys())


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--max-cases", type=int, default=10,
                        help="Max cases per view (AP/Lateral)")
    parser.add_argument("--out", type=Path, default=OUT_DIR)
    args = parser.parse_args()

    out = args.out
    print(f"Output: {out}")

    # Collect cases
    print("\nCollecting AP cases...")
    ap_cases = collect_cases(AP_SOURCES, args.max_cases)
    print(f"  Found {len(ap_cases)} AP cases")

    print("Collecting Lateral cases...")
    lat_cases = collect_cases(LAT_SOURCES, args.max_cases)
    print(f"  Found {len(lat_cases)} Lateral cases")

    if not ap_cases and not lat_cases:
        print("No cases found! Check source paths.")
        return

    # Clean output dirs
    for sub in ["ap", "lateral", "labels"]:
        d = out / sub
        if d.exists():
            shutil.rmtree(d)

    all_label_names = set()
    ap_dims = (0, 0)
    lat_dims = (0, 0)

    # Convert AP
    print("\nConverting AP cases...")
    for i, (img_p, json_p) in enumerate(ap_cases):
        out_img = out / "ap" / f"{str(i).zfill(4)}.png"
        out_lbl = out / "labels" / "ap" / f"{str(i).zfill(4)}.json"
        w, h, names = convert_case(img_p, json_p, out_img, out_lbl, TARGET_H)
        all_label_names.update(names)
        if i == 0:
            ap_dims = (w, h)
        print(f"  [{i}] {img_p.name} → {len(names)} structures, {w}x{h}")

    # Convert Lateral
    print("\nConverting Lateral cases...")
    for i, (img_p, json_p) in enumerate(lat_cases):
        out_img = out / "lateral" / f"{str(i).zfill(4)}.png"
        out_lbl = out / "labels" / "lateral" / f"{str(i).zfill(4)}.json"
        w, h, names = convert_case(img_p, json_p, out_img, out_lbl, TARGET_H)
        all_label_names.update(names)
        if i == 0:
            lat_dims = (w, h)
        print(f"  [{i}] {img_p.name} → {len(names)} structures, {w}x{h}")

    # Build structures.json
    sorted_names = sorted(all_label_names)
    structures = []
    for i, name in enumerate(sorted_names):
        cat, color = CATEGORY_MAP.get(name, ("other", "#64748B"))
        dn = DISPLAY_NAMES.get(name, {"en": name.replace("_", " ").title(), "ko": name.replace("_", " ")})
        display = {lang: dn.get(lang, dn["en"]) for lang in ["en", "ko", "ja", "zh", "es", "de", "fr"]}
        structures.append({
            "id": i,
            "name": name,
            "displayName": display,
            "category": cat,
            "color": color,
            "bestSlice": {"ap": 0, "lateral": 0},
            "sliceRange": {"ap": [0, max(0, len(ap_cases) - 1)], "lateral": [0, max(0, len(lat_cases) - 1)]},
        })

    # Assign correct IDs in label JSONs
    name_to_id = {s["name"]: s["id"] for s in structures}
    for jp in sorted((out / "labels").rglob("*.json")):
        with open(jp) as f:
            labels = json.load(f)
        for label in labels:
            label["id"] = name_to_id.get(label["name"], -1)
        with open(jp, "w") as f:
            json.dump(labels, f, separators=(",", ":"))

    # Write structures.json
    with open(out / "structures.json", "w") as f:
        json.dump({"totalStructures": len(structures), "structures": structures}, f, indent=2, ensure_ascii=False)
    print(f"\nstructures.json: {len(structures)} structures")

    # Write info.json
    info = {
        "modality": "X-Ray",
        "planes": {
            "ap":      {"slices": len(ap_cases), "width": ap_dims[0], "height": ap_dims[1]},
            "lateral": {"slices": len(lat_cases), "width": lat_dims[0], "height": lat_dims[1]},
        },
    }
    with open(out / "info.json", "w") as f:
        json.dump(info, f, indent=2)

    print(f"\nDone! AP: {len(ap_cases)} cases, Lateral: {len(lat_cases)} cases")
    print(f"Total unique structures: {len(structures)}")


if __name__ == "__main__":
    main()
