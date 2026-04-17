r"""auto_model_monitor.py - SPINAI model monitor + BodyAtlas auto-update.

Windows Task Scheduler runs daily:
  pythonw scripts\auto_model_monitor.py

Flow:
  1. Parse D:\ImageLabelAPI_SPINAI\outputs\models\ train.log files
  2. If Best Dice >= threshold -> inference -> atlas rebuild
  3. Git commit + push if changed
  4. Log to scripts/monitor_log.txt
"""

import json
import os
import re
import subprocess
import sys
import datetime
from pathlib import Path

# Force UTF-8 stdout on Windows
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

# -- paths --
PROJECT_ROOT = Path(__file__).resolve().parent.parent
SPINAI_ROOT = Path("D:/ImageLabelAPI_SPINAI")
MODELS_DIR = SPINAI_ROOT / "outputs" / "models"
STATUS_FILE = PROJECT_ROOT / "scripts" / "monitor_status.json"
LOG_FILE = PROJECT_ROOT / "scripts" / "monitor_log.txt"

PYTHON_SPINAI = "C:/Users/taesh/Anaconda3/python.exe"

# -- Dice thresholds --
THRESHOLDS = {
    "ct":   0.85,
    "mri":  0.70,
    "xray": 0.90,
}

# model -> BodyAtlas atlas mapping
MODEL_ATLAS_MAP = {
    "ct": {
        "atlas_output": PROJECT_ROOT / "public" / "data" / "our-ct",
        "source_ct": SPINAI_ROOT / "data" / "cat_F_opensource" / "TotalSegmentator_v2" / "s0174" / "ct.nii.gz",
    },
    "mri": {
        "atlas_output": PROJECT_ROOT / "public" / "data" / "our-lumbar-mri",
        "source_mri": SPINAI_ROOT / "data" / "cat_F_opensource" / "SPIDER_lumbar" / "images" / "1_t2.mha",
    },
    "xray": {
        "atlas_output": PROJECT_ROOT / "public" / "data" / "our-xray",
        "max_cases": 10,
    },
}


def log(msg: str):
    ts = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    line = f"[{ts}] {msg}"
    print(line)
    with open(LOG_FILE, "a", encoding="utf-8") as f:
        f.write(line + "\n")


def load_status() -> dict:
    if STATUS_FILE.exists():
        return json.loads(STATUS_FILE.read_text(encoding="utf-8"))
    return {}


def save_status(status: dict):
    STATUS_FILE.write_text(json.dumps(status, indent=2, ensure_ascii=False), encoding="utf-8")


def parse_train_logs() -> list:
    """Parse all model train.log files and extract best Dice."""
    results = []
    if not MODELS_DIR.exists():
        return results

    for model_dir in sorted(MODELS_DIR.iterdir()):
        if not model_dir.is_dir():
            continue
        log_file = model_dir / "train.log"
        if not log_file.exists():
            continue

        name = model_dir.name
        if "_ct_" in name:
            modality = "ct"
        elif "_mri_" in name:
            modality = "mri"
        elif "_xray_" in name:
            modality = "xray"
        else:
            continue

        best_dice = 0.0
        training_complete = False
        last_epoch = 0
        total_epochs = 0
        has_best_model = (model_dir / "best_model.pth").exists()

        text = log_file.read_text(encoding="utf-8", errors="ignore")
        for line in text.splitlines():
            m = re.search(r"Training complete\.\s*Best Dice:\s*([\d.]+)", line)
            if m:
                training_complete = True
                best_dice = max(best_dice, float(m.group(1)))

            m = re.search(r"New best Dice:\s*([\d.]+)", line)
            if m:
                best_dice = max(best_dice, float(m.group(1)))

            m = re.search(r"Epoch\s+(\d+)/(\d+)", line)
            if m:
                last_epoch = int(m.group(1))
                total_epochs = int(m.group(2))

        results.append({
            "name": name,
            "modality": modality,
            "best_dice": best_dice,
            "threshold": THRESHOLDS.get(modality, 1.0),
            "passed": best_dice >= THRESHOLDS.get(modality, 1.0),
            "training_complete": training_complete,
            "last_epoch": last_epoch,
            "total_epochs": total_epochs,
            "has_checkpoint": has_best_model,
            "model_dir": str(model_dir),
        })

    return results


def find_best_model(models: list, modality: str):
    """Return the best model that passes threshold for given modality."""
    candidates = [m for m in models if m["modality"] == modality and m["passed"] and m["has_checkpoint"]]
    if not candidates:
        return None
    return max(candidates, key=lambda m: m["best_dice"])


def run_ct_inference_and_rebuild(model_info: dict) -> bool:
    """Run CT model inference then rebuild atlas."""
    model_dir = Path(model_info["model_dir"])
    ckpt = model_dir / "best_model.pth"
    source_ct = MODEL_ATLAS_MAP["ct"]["source_ct"]
    atlas_out = MODEL_ATLAS_MAP["ct"]["atlas_output"]

    if not source_ct.exists():
        log(f"  [FAIL] Source CT not found: {source_ct}")
        return False
    if not ckpt.exists():
        log(f"  [FAIL] Checkpoint not found: {ckpt}")
        return False

    # Step 1: SPINAI inference -> per-class NIfTI masks
    inference_out = PROJECT_ROOT / "data_pipeline" / "spinai_ct_seg"
    inference_out.mkdir(parents=True, exist_ok=True)

    inference_script = PROJECT_ROOT / "scripts" / "_spinai_ct_inference.py"
    _write_ct_inference_script(inference_script, ckpt, source_ct, inference_out)

    log(f"  Running CT inference: {model_info['name']} (Dice={model_info['best_dice']:.4f})...")
    result = subprocess.run(
        [PYTHON_SPINAI, str(inference_script)],
        capture_output=True, text=True, timeout=1800,
        cwd=str(PROJECT_ROOT),
    )
    if result.returncode != 0:
        log(f"  [FAIL] Inference failed: {result.stderr[-500:]}")
        return False
    log(f"  [OK] Inference complete")

    # Step 2: rebuild atlas from inference results
    rebuild_script = PROJECT_ROOT / "scripts" / "_spinai_ct_rebuild.py"
    _write_ct_rebuild_script(rebuild_script, source_ct, inference_out, atlas_out)

    log(f"  Rebuilding atlas -> {atlas_out}...")
    result = subprocess.run(
        [PYTHON_SPINAI, str(rebuild_script)],
        capture_output=True, text=True, timeout=3600,
        cwd=str(PROJECT_ROOT),
    )
    if result.returncode != 0:
        log(f"  [FAIL] Atlas rebuild failed: {result.stderr[-500:]}")
        return False
    log(f"  [OK] Atlas rebuilt")
    return True


def _write_ct_inference_script(script_path: Path, ckpt: Path, ct_path: Path, out_dir: Path):
    code = f'''"""Auto-generated CT inference script."""
import sys
import numpy as np
import nibabel as nib
from pathlib import Path

SPINAI_ROOT = Path(r"{SPINAI_ROOT}")
sys.path.insert(0, str(SPINAI_ROOT / "src"))

from inference.predictor import SpinAIPredictor, CT65_NAMES

ckpt = r"{ckpt}"
ct_path = r"{ct_path}"
out_dir = Path(r"{out_dir}")
out_dir.mkdir(parents=True, exist_ok=True)

print(f"Loading CT: {{ct_path}}")
ct_img = nib.load(ct_path)
ct_data = ct_img.get_fdata(dtype=np.float32)
affine = ct_img.affine
print(f"CT shape: {{ct_data.shape}}")

predictor = SpinAIPredictor(checkpoints={{"ct": ckpt}})
vol = np.moveaxis(ct_data, 2, 0)
mask_vol = predictor.predict_volume(vol, "ct", batch_size=8)
mask_vol = np.moveaxis(mask_vol, 0, 2)
print(f"Mask shape: {{mask_vol.shape}}, unique classes: {{np.unique(mask_vol).size}}")

seg_dir = out_dir / "segmentations"
seg_dir.mkdir(exist_ok=True)

for cid, cname in CT65_NAMES.items():
    if cid == 0:
        continue
    binary = (mask_vol == cid).astype(np.uint8)
    if binary.sum() == 0:
        continue
    nib.save(nib.Nifti1Image(binary, affine), seg_dir / f"{{cname}}.nii.gz")
    print(f"  Saved {{cname}}: {{binary.sum()}} voxels")

print(f"Done: {{len(list(seg_dir.glob(chr(42) + '.nii.gz')))}} structures saved")
'''
    script_path.write_text(code, encoding="utf-8")


def _write_ct_rebuild_script(script_path: Path, ct_path: Path, seg_dir: Path, atlas_out: Path):
    code = f'''"""Auto-generated atlas rebuild from SPINAI inference."""
import sys
from pathlib import Path
import numpy as np
import nibabel as nib

PROJECT_ROOT = Path(r"{PROJECT_ROOT}")
sys.path.insert(0, str(PROJECT_ROOT / "scripts"))

from gen_our_ct_atlas import build_atlas

seg_dir = Path(r"{seg_dir}") / "segmentations"
ct_path = Path(r"{ct_path}")
atlas_out = Path(r"{atlas_out}")

print(f"Loading segmentations from {{seg_dir}}")
merged = {{}}
for f in sorted(seg_dir.glob("*.nii.gz")):
    name = f.stem.replace(".nii", "")
    img = nib.load(f)
    data = img.get_fdata(dtype=np.float32)
    if data.max() > 0:
        merged[name] = (data, img.affine)
print(f"Loaded {{len(merged)}} structures")

build_atlas(ct_path, merged, atlas_out)
print("Atlas rebuild complete")
'''
    script_path.write_text(code, encoding="utf-8")


def run_mri_rebuild(model_info: dict) -> bool:
    """Run MRI atlas rebuild using gen_our_lumbar_mri_atlas.py."""
    ckpt = Path(model_info["model_dir"]) / "best_model.pth"
    if not ckpt.exists():
        log(f"  [FAIL] MRI checkpoint not found: {ckpt}")
        return False

    script = PROJECT_ROOT / "scripts" / "gen_our_lumbar_mri_atlas.py"
    log(f"  Running MRI rebuild: {model_info['name']} (Dice={model_info['best_dice']:.4f})...")
    result = subprocess.run(
        [PYTHON_SPINAI, str(script), "--checkpoint", str(ckpt),
         "--out", str(MODEL_ATLAS_MAP["mri"]["atlas_output"])],
        capture_output=True, text=True, timeout=1800,
        cwd=str(PROJECT_ROOT),
    )
    if result.returncode != 0:
        log(f"  [FAIL] MRI rebuild failed: {result.stderr[-500:]}")
        return False
    log(f"  [OK] MRI atlas rebuilt")
    return True


def run_xray_rebuild(model_info: dict) -> bool:
    """Run X-ray atlas rebuild using gen_our_xray_atlas.py."""
    ckpt = Path(model_info["model_dir"]) / "best_model.pth"
    if not ckpt.exists():
        log(f"  [FAIL] X-ray checkpoint not found: {ckpt}")
        return False

    script = PROJECT_ROOT / "scripts" / "gen_our_xray_atlas.py"
    max_cases = MODEL_ATLAS_MAP["xray"].get("max_cases", 10)
    log(f"  Running X-ray rebuild: {model_info['name']} (Dice={model_info['best_dice']:.4f})...")
    result = subprocess.run(
        [PYTHON_SPINAI, str(script), "--checkpoint", str(ckpt),
         "--out", str(MODEL_ATLAS_MAP["xray"]["atlas_output"]),
         "--max-cases", str(max_cases)],
        capture_output=True, text=True, timeout=1800,
        cwd=str(PROJECT_ROOT),
    )
    if result.returncode != 0:
        log(f"  [FAIL] X-ray rebuild failed: {result.stderr[-500:]}")
        return False
    log(f"  [OK] X-ray atlas rebuilt")
    return True


def git_commit_and_push(message: str) -> bool:
    try:
        os.chdir(str(PROJECT_ROOT))

        result = subprocess.run(["git", "status", "--porcelain"], capture_output=True, text=True)
        if not result.stdout.strip():
            log("  No changes to commit")
            return False

        subprocess.run(["git", "add", "public/data/"], check=True, capture_output=True)
        subprocess.run(["git", "add", "scripts/monitor_status.json"], check=False, capture_output=True)

        subprocess.run(
            ["git", "commit", "-m", message],
            check=True, capture_output=True, text=True,
        )
        subprocess.run(
            ["git", "push"],
            check=True, capture_output=True, text=True, timeout=120,
        )
        log("  [OK] Git commit + push done")
        return True
    except subprocess.CalledProcessError as e:
        log(f"  [FAIL] Git error: {e}")
        return False


def main():
    log("=" * 60)
    log("SPINAI Model Monitor START")
    log("=" * 60)

    # 1. Scan all models
    models = parse_train_logs()
    if not models:
        log("No models found.")
        return

    log(f"Found {len(models)} models:")
    for m in models:
        status = "PASS" if m["passed"] else "FAIL"
        train = "done" if m["training_complete"] else f"epoch {m['last_epoch']}/{m['total_epochs']}"
        log(f"  {m['name']}: Dice={m['best_dice']:.4f} (threshold {m['threshold']}) [{status}] [{train}]")

    # 2. Compare with previous state
    prev_status = load_status()
    updated_atlases = []

    for modality in ["ct", "mri", "xray"]:
        best = find_best_model(models, modality)
        if not best:
            continue

        prev_key = f"applied_{modality}"
        prev_model = prev_status.get(prev_key, {}).get("name")
        prev_dice = prev_status.get(prev_key, {}).get("dice", 0)

        if best["name"] == prev_model and best["best_dice"] <= prev_dice:
            log(f"[{modality.upper()}] Already up to date: {best['name']} (Dice={best['best_dice']:.4f})")
            continue

        log(f"[{modality.upper()}] New model detected: {best['name']} Dice={best['best_dice']:.4f}")

        # 3. Rebuild atlas
        success = False
        if modality == "ct" and modality in MODEL_ATLAS_MAP:
            success = run_ct_inference_and_rebuild(best)
        elif modality == "mri" and modality in MODEL_ATLAS_MAP:
            success = run_mri_rebuild(best)
        elif modality == "xray" and modality in MODEL_ATLAS_MAP:
            success = run_xray_rebuild(best)
        else:
            log(f"  [SKIP] {modality} atlas auto-rebuild not yet implemented")
            continue

        if success:
            prev_status[prev_key] = {
                "name": best["name"],
                "dice": best["best_dice"],
                "applied_at": datetime.datetime.now().isoformat(),
            }
            updated_atlases.append(modality)

    # 4. Save status
    prev_status["last_check"] = datetime.datetime.now().isoformat()
    prev_status["models"] = {m["name"]: {"dice": m["best_dice"], "modality": m["modality"]} for m in models}
    save_status(prev_status)

    # 5. Git commit + push (only if atlas changed)
    if updated_atlases:
        msg = f"auto: update {', '.join(updated_atlases)} atlas from SPINAI models\n\n"
        for mod in updated_atlases:
            info = prev_status[f"applied_{mod}"]
            msg += f"- {mod}: {info['name']} (Dice={info['dice']:.4f})\n"
        git_commit_and_push(msg)

    log("Monitor complete\n")


if __name__ == "__main__":
    main()
