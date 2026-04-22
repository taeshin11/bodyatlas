r"""auto_model_monitor.py - SPINAI model monitor + BodyAtlas auto-update.

Windows Task Scheduler runs daily:
  pythonw scripts\auto_model_monitor.py

Flow:
  1. Parse D:\ImageLabelAPI_SPINAI\outputs\models\ train.log files
  2. If Best Dice >= threshold -> inference -> atlas rebuild
  3. Git commit + push if changed
  4. Log to scripts/monitor_log.txt (structured: timestamps, stages, full traceback on errors)
"""

import json
import os
import re
import subprocess
import sys
import datetime
import time
from pathlib import Path

THIS_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(THIS_DIR))
from _log_utils import Logger, Stage, install_excepthook

# -- paths --
PROJECT_ROOT = Path(__file__).resolve().parent.parent
SPINAI_ROOT = Path("D:/ImageLabelAPI_SPINAI")
MODELS_DIR = SPINAI_ROOT / "outputs" / "models"
STATUS_FILE = PROJECT_ROOT / "scripts" / "monitor_status.json"
LOG_FILE = PROJECT_ROOT / "scripts" / "monitor_log.txt"

PYTHON_SPINAI = "C:/Users/taesh/Anaconda3/python.exe"

# Single shared logger instance
log = Logger("auto_monitor", log_file=LOG_FILE)
install_excepthook(log)

# -- Dice thresholds --
THRESHOLDS = {
    "ct":   0.85,
    "mri":  0.70,
    "xray": 0.90,
    "hand": 0.90,
    "foot": 0.90,
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
    "hand": {
        "atlas_output": PROJECT_ROOT / "public" / "data" / "our-hand-xray",
        "max_cases": 10,
    },
    "foot": {
        "atlas_output": PROJECT_ROOT / "public" / "data" / "our-foot-xray",
        "max_cases": 10,
    },
}


def load_status() -> dict:
    if STATUS_FILE.exists():
        try:
            return json.loads(STATUS_FILE.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            log.error(f"monitor_status.json malformed; treating as empty", exc=True)
            return {}
    return {}


def save_status(status: dict):
    try:
        STATUS_FILE.write_text(json.dumps(status, indent=2, ensure_ascii=False), encoding="utf-8")
    except OSError:
        log.error(f"failed to write {STATUS_FILE}", exc=True)


def parse_train_logs() -> list:
    """Parse all model train.log files and extract best Dice."""
    results = []
    if not MODELS_DIR.exists():
        log.error(f"MODELS_DIR does not exist: {MODELS_DIR}")
        return results

    model_dirs = sorted([d for d in MODELS_DIR.iterdir() if d.is_dir()])
    log.debug(f"scanning {len(model_dirs)} model directories")

    for model_dir in model_dirs:
        log_path = model_dir / "train.log"
        history_path = model_dir / "training_history.json"
        has_log = log_path.exists()
        has_history = history_path.exists() and history_path.stat().st_size > 10
        if not has_log and not has_history:
            log.debug(f"  skip {model_dir.name}: no train.log + no training_history.json")
            continue

        name = model_dir.name
        if "_ct_" in name:
            modality = "ct"
        elif "_mri_" in name:
            modality = "mri"
        elif "_xray_" in name:
            modality = "xray"
        elif "_hand_" in name:
            modality = "hand"
        elif "_foot_" in name:
            modality = "foot"
        else:
            log.debug(f"  skip {name}: cannot infer modality")
            continue

        best_dice = 0.0
        training_complete = False
        last_epoch = 0
        total_epochs = 0
        has_best_model = (model_dir / "best_model.pth").exists()

        if has_log:
            try:
                text = log_path.read_text(encoding="utf-8", errors="ignore")
            except OSError as e:
                log.error(f"  failed to read {log_path}: {e}")
                text = ""

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

        # Fallback: training_history.json (list of per-epoch dicts)
        if best_dice == 0.0 and has_history:
            try:
                hist = json.loads(history_path.read_text(encoding="utf-8"))
            except Exception:
                log.error(f"  failed to parse {history_path}", exc=True)
                hist = None
            if isinstance(hist, list) and hist:
                val_dices = [e.get("val_dice") for e in hist if isinstance(e, dict) and e.get("val_dice") is not None]
                if val_dices:
                    best_dice = max(val_dices)
                    last_epoch = len(hist)
                    # heuristic: treat as complete when last epoch has val_dice
                    training_complete = True

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
    with Stage(log, f"CT inference+rebuild for {model_info['name']}"):
        model_dir = Path(model_info["model_dir"])
        ckpt = model_dir / "best_model.pth"
        source_ct = MODEL_ATLAS_MAP["ct"]["source_ct"]
        atlas_out = MODEL_ATLAS_MAP["ct"]["atlas_output"]

        log.kv("checkpoint", ckpt)
        log.kv("source CT", source_ct)
        log.kv("atlas output", atlas_out)

        if not source_ct.exists():
            log.error(f"source CT missing: {source_ct}")
            return False
        if not ckpt.exists():
            log.error(f"checkpoint missing: {ckpt}")
            return False

        # Step 1: SPINAI inference -> per-class NIfTI masks
        with Stage(log, "step 1/2: SPINAI CT inference"):
            inference_out = PROJECT_ROOT / "data_pipeline" / "spinai_ct_seg"
            inference_out.mkdir(parents=True, exist_ok=True)
            inference_script = PROJECT_ROOT / "scripts" / "_spinai_ct_inference.py"
            _write_ct_inference_script(inference_script, ckpt, source_ct, inference_out)

            ok = log.run_subprocess(
                [PYTHON_SPINAI, str(inference_script)],
                timeout=1800, cwd=PROJECT_ROOT,
                label=f"CT inference (Dice={model_info['best_dice']:.4f})",
            )
            if not ok:
                return False

        # Step 2: rebuild atlas from inference results
        with Stage(log, "step 2/2: atlas rebuild"):
            rebuild_script = PROJECT_ROOT / "scripts" / "_spinai_ct_rebuild.py"
            _write_ct_rebuild_script(rebuild_script, source_ct, inference_out, atlas_out)
            ok = log.run_subprocess(
                [PYTHON_SPINAI, str(rebuild_script)],
                timeout=3600, cwd=PROJECT_ROOT,
                label="atlas rebuild from segmentations",
            )
            if not ok:
                return False

        log.ok(f"CT atlas rebuilt -> {atlas_out}")
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
    with Stage(log, f"MRI rebuild for {model_info['name']}"):
        ckpt = Path(model_info["model_dir"]) / "best_model.pth"
        log.kv("checkpoint", ckpt)
        log.kv("atlas output", MODEL_ATLAS_MAP["mri"]["atlas_output"])

        if not ckpt.exists():
            log.error(f"MRI checkpoint missing: {ckpt}")
            return False

        script = PROJECT_ROOT / "scripts" / "gen_our_lumbar_mri_atlas.py"
        ok = log.run_subprocess(
            [PYTHON_SPINAI, str(script), "--checkpoint", str(ckpt),
             "--out", str(MODEL_ATLAS_MAP["mri"]["atlas_output"])],
            timeout=1800, cwd=PROJECT_ROOT,
            label=f"MRI atlas builder (Dice={model_info['best_dice']:.4f})",
        )
        if not ok:
            return False
        log.ok(f"MRI atlas rebuilt -> {MODEL_ATLAS_MAP['mri']['atlas_output']}")
        return True


def run_joint_xray_rebuild(model_info: dict, modality: str) -> bool:
    """Run hand/foot X-ray atlas rebuild using gen_our_joint_xray_atlas.py."""
    with Stage(log, f"{modality.upper()} rebuild for {model_info['name']}"):
        ckpt = Path(model_info["model_dir"]) / "best_model.pth"
        atlas_out = MODEL_ATLAS_MAP[modality]["atlas_output"]
        log.kv("checkpoint", ckpt)
        log.kv("atlas output", atlas_out)

        if not ckpt.exists():
            log.error(f"{modality} checkpoint missing: {ckpt}")
            return False

        script = PROJECT_ROOT / "scripts" / "gen_our_joint_xray_atlas.py"
        max_cases = MODEL_ATLAS_MAP[modality].get("max_cases", 10)
        ok = log.run_subprocess(
            [PYTHON_SPINAI, str(script),
             "--modality", modality,
             "--checkpoint", str(ckpt),
             "--out", str(atlas_out),
             "--max-cases", str(max_cases)],
            timeout=1800, cwd=PROJECT_ROOT,
            label=f"{modality} atlas builder (Dice={model_info['best_dice']:.4f})",
        )
        if not ok:
            return False
        log.ok(f"{modality.upper()} atlas rebuilt -> {atlas_out}")
        return True


def run_xray_rebuild(model_info: dict) -> bool:
    """Run X-ray atlas rebuild using gen_our_xray_atlas.py."""
    with Stage(log, f"X-ray rebuild for {model_info['name']}"):
        ckpt = Path(model_info["model_dir"]) / "best_model.pth"
        log.kv("checkpoint", ckpt)
        log.kv("atlas output", MODEL_ATLAS_MAP["xray"]["atlas_output"])

        if not ckpt.exists():
            log.error(f"X-ray checkpoint missing: {ckpt}")
            return False

        script = PROJECT_ROOT / "scripts" / "gen_our_xray_atlas.py"
        max_cases = MODEL_ATLAS_MAP["xray"].get("max_cases", 10)
        ok = log.run_subprocess(
            [PYTHON_SPINAI, str(script), "--checkpoint", str(ckpt),
             "--out", str(MODEL_ATLAS_MAP["xray"]["atlas_output"]),
             "--max-cases", str(max_cases)],
            timeout=1800, cwd=PROJECT_ROOT,
            label=f"X-ray atlas builder (Dice={model_info['best_dice']:.4f})",
        )
        if not ok:
            return False
        log.ok(f"X-ray atlas rebuilt -> {MODEL_ATLAS_MAP['xray']['atlas_output']}")
        return True


SW_PATH = PROJECT_ROOT / "public" / "sw.js"
SW_CACHE_RE = re.compile(r"const CACHE_NAME = 'bodyatlas-v(\d+)';")


def bump_sw_cache_version() -> bool:
    """Bump CACHE_NAME 'bodyatlas-vN' -> 'bodyatlas-v(N+1)' in public/sw.js.

    Called before git_commit_and_push when atlas data is about to change, so PWA
    clients invalidate their cached /data/ entries on next visit (cache-first
    SW behavior added R23). Returns True on successful bump, False if pattern
    not found or write failed (caller should warn but not abort the commit).
    """
    try:
        text = SW_PATH.read_text(encoding="utf-8")
    except OSError as e:
        log.warn(f"sw.js read failed: {e}")
        return False
    m = SW_CACHE_RE.search(text)
    if not m:
        log.warn(f"sw.js CACHE_NAME pattern not found, skipping bump")
        return False
    old_n = int(m.group(1))
    new_n = old_n + 1
    new_text = SW_CACHE_RE.sub(f"const CACHE_NAME = 'bodyatlas-v{new_n}';", text, count=1)
    try:
        SW_PATH.write_text(new_text, encoding="utf-8")
    except OSError as e:
        log.warn(f"sw.js write failed: {e}")
        return False
    log.kv("sw.js CACHE_NAME bumped", f"v{old_n} -> v{new_n}")
    return True


def git_commit_and_push(message: str) -> bool:
    with Stage(log, "git commit + push"):
        try:
            os.chdir(str(PROJECT_ROOT))
        except OSError as e:
            log.error(f"cannot chdir to {PROJECT_ROOT}: {e}")
            return False

        try:
            result = subprocess.run(
                ["git", "status", "--porcelain"],
                capture_output=True, text=True, encoding="utf-8", errors="replace",
            )
        except Exception:
            log.error("git status failed", exc=True)
            return False

        if not result.stdout.strip():
            log.skip("no changes to commit")
            return False

        changed_count = len(result.stdout.strip().splitlines())
        log.info(f"{changed_count} changed paths")

        # Atlas data is changing -> bump SW cache so PWA users get fresh data
        # on next visit. Cache-first /data/ matcher (R23) means stale cache
        # would otherwise persist until next manual sw.js change.
        bump_sw_cache_version()

        try:
            subprocess.run(["git", "add", "public/data/"], check=True, capture_output=True)
            subprocess.run(["git", "add", "public/sw.js"], check=False, capture_output=True)
            subprocess.run(["git", "add", "scripts/monitor_status.json"], check=False, capture_output=True)
        except subprocess.CalledProcessError as e:
            log.error(f"git add failed: rc={e.returncode}")
            log.error(f"  stderr: {(e.stderr or b'').decode('utf-8', 'replace')[:500]}")
            return False

        try:
            res = subprocess.run(
                ["git", "commit", "-m", message],
                check=True, capture_output=True, text=True, encoding="utf-8", errors="replace",
            )
            log.debug(f"commit stdout tail: {res.stdout.rstrip().splitlines()[-1] if res.stdout.strip() else ''}")
        except subprocess.CalledProcessError as e:
            log.error(f"git commit failed: rc={e.returncode}")
            log.error(f"  stderr: {(e.stderr or '')[:500]}")
            return False

        try:
            res = subprocess.run(
                ["git", "push"],
                check=True, capture_output=True, text=True, timeout=120, encoding="utf-8", errors="replace",
            )
            log.debug(f"push stderr (info): {(res.stderr or '').rstrip()[:300]}")
        except subprocess.TimeoutExpired:
            log.error("git push timed out (120s)")
            return False
        except subprocess.CalledProcessError as e:
            log.error(f"git push failed: rc={e.returncode}")
            log.error(f"  stderr: {(e.stderr or '')[:500]}")
            return False

        log.ok("git commit + push complete")
        return True


def main():
    overall_start = time.perf_counter()
    log.banner("SPINAI Model Monitor START")
    log.info(f"PROJECT_ROOT: {PROJECT_ROOT}")
    log.info(f"SPINAI_ROOT:  {SPINAI_ROOT}")
    log.info(f"PYTHON:       {PYTHON_SPINAI}")
    log.info(f"thresholds:   {THRESHOLDS}")

    # Stage 1: scan models
    with Stage(log, "1/4 scan models"):
        models = parse_train_logs()
        if not models:
            log.error("no models found in MODELS_DIR")
            return
        log.info(f"found {len(models)} models")
        for m in models:
            status = "PASS" if m["passed"] else "FAIL"
            train = "done" if m["training_complete"] else f"epoch {m['last_epoch']}/{m['total_epochs']}"
            ckpt = "ckpt" if m["has_checkpoint"] else "NO-CKPT"
            log.info(
                f"  [{status}] {m['name']}: Dice={m['best_dice']:.4f} "
                f"(threshold {m['threshold']}) [{train}] [{ckpt}]"
            )

    # Stage 2: rebuild atlases for new/improved models
    prev_status = load_status()
    updated_atlases = []

    with Stage(log, "2/4 evaluate + rebuild per modality"):
        for modality in ["ct", "mri", "xray", "hand", "foot"]:
            best = find_best_model(models, modality)
            if not best:
                log.skip(f"[{modality.upper()}] no passing model with checkpoint")
                continue

            prev_key = f"applied_{modality}"
            prev_model = prev_status.get(prev_key, {}).get("name")
            prev_dice = prev_status.get(prev_key, {}).get("dice", 0)

            if best["name"] == prev_model and best["best_dice"] <= prev_dice:
                log.skip(
                    f"[{modality.upper()}] up to date: {best['name']} (Dice={best['best_dice']:.4f})"
                )
                continue

            log.info(
                f"[{modality.upper()}] new model: {best['name']} "
                f"Dice={best['best_dice']:.4f} (was: {prev_model}@{prev_dice:.4f})"
            )

            success = False
            t0 = time.perf_counter()
            try:
                if modality == "ct" and modality in MODEL_ATLAS_MAP:
                    success = run_ct_inference_and_rebuild(best)
                elif modality == "mri" and modality in MODEL_ATLAS_MAP:
                    success = run_mri_rebuild(best)
                elif modality == "xray" and modality in MODEL_ATLAS_MAP:
                    success = run_xray_rebuild(best)
                elif modality in ("hand", "foot") and modality in MODEL_ATLAS_MAP:
                    success = run_joint_xray_rebuild(best, modality)
                else:
                    log.skip(f"  no rebuild handler for {modality}")
                    continue
            except Exception:
                log.error(f"[{modality.upper()}] rebuild crashed", exc=True)
                continue

            elapsed = time.perf_counter() - t0
            if success:
                log.ok(f"[{modality.upper()}] rebuild complete in {elapsed:.1f}s")
                prev_status[prev_key] = {
                    "name": best["name"],
                    "dice": best["best_dice"],
                    "applied_at": datetime.datetime.now().isoformat(),
                }
                updated_atlases.append(modality)
            else:
                log.error(f"[{modality.upper()}] rebuild FAILED after {elapsed:.1f}s")

    # Stage 3: persist status
    with Stage(log, "3/4 save monitor_status.json"):
        prev_status["last_check"] = datetime.datetime.now().isoformat()
        prev_status["models"] = {m["name"]: {"dice": m["best_dice"], "modality": m["modality"]} for m in models}
        save_status(prev_status)
        log.info(f"updated_atlases this run: {updated_atlases or 'none'}")

    # Stage 4: git commit + push
    with Stage(log, "4/4 git commit + push"):
        if updated_atlases:
            msg = f"auto: update {', '.join(updated_atlases)} atlas from SPINAI models\n\n"
            for mod in updated_atlases:
                info = prev_status[f"applied_{mod}"]
                msg += f"- {mod}: {info['name']} (Dice={info['dice']:.4f})\n"
            git_commit_and_push(msg)
        else:
            log.skip("no atlases changed; skipping git operations")

    total = time.perf_counter() - overall_start
    log.banner(f"Monitor complete (total {total:.1f}s)")


if __name__ == "__main__":
    try:
        main()
    except Exception:
        log.fatal("Monitor crashed in main()")
        sys.exit(1)
