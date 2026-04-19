"""build_and_push.py — one-shot "save everything, verify, push" entry point.

Stages:
  1/5 git status (dirty summary)
  2/5 tsc --noEmit
  3/5 next build
  4/5 git add/commit (if --commit-msg provided)
  5/5 git push (unless --no-push)

Every stage's subprocess output is captured and logged via _log_utils.
Exit code is non-zero on any failing stage. Designed to replace ad-hoc
  npx tsc && npx next build && git push
chains so that a failure anywhere surfaces with full context.

Usage:
  python scripts/build_and_push.py --commit-msg "feat: X"
  python scripts/build_and_push.py --no-build            # skip build (commit+push only)
  python scripts/build_and_push.py --no-push             # verify + commit, no push
  python scripts/build_and_push.py --dry-run             # no git writes
"""
from __future__ import annotations

import argparse
import sys
import time
from pathlib import Path

THIS_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(THIS_DIR))
from _log_utils import Logger, Stage, install_excepthook

PROJECT_ROOT = THIS_DIR.parent
LOG_FILE = PROJECT_ROOT / "scripts" / "monitor_log.txt"
log = Logger("build_push", log_file=LOG_FILE)
install_excepthook(log)


def run_stage(cmd: list[str], label: str, timeout: int = 600) -> bool:
    return log.run_subprocess(cmd, timeout=timeout, cwd=PROJECT_ROOT, label=label)


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--commit-msg", type=str, default=None,
                   help="If set, runs `git add -A && git commit -m <msg>`")
    p.add_argument("--no-build", action="store_true", help="Skip tsc + next build")
    p.add_argument("--no-push", action="store_true", help="Skip git push")
    p.add_argument("--dry-run", action="store_true", help="No git writes (add/commit/push)")
    p.add_argument("--timeout-build", type=int, default=600)
    args = p.parse_args()

    started = time.perf_counter()
    log.banner("build_and_push START")
    log.kv("PROJECT_ROOT", PROJECT_ROOT)
    log.kv("commit_msg", args.commit_msg or "(none, will skip commit)")
    log.kv("no-build", args.no_build)
    log.kv("no-push", args.no_push)
    log.kv("dry-run", args.dry_run)

    failures: list[str] = []

    # 1/5 git status
    with Stage(log, "1/5 git status (dirty check)"):
        ok = run_stage(["git", "status", "--porcelain"], "git status")
        if not ok:
            failures.append("git status")

    # 2/5 typecheck
    if not args.no_build:
        with Stage(log, "2/5 tsc --noEmit"):
            ok = run_stage(["npx", "tsc", "--noEmit"], "tsc --noEmit", timeout=args.timeout_build)
            if not ok:
                failures.append("tsc")
    else:
        log.skip("2/5 tsc: skipped (--no-build)")

    # 3/5 production build
    if not args.no_build:
        with Stage(log, "3/5 next build"):
            ok = run_stage(["npx", "next", "build"], "next build", timeout=args.timeout_build)
            if not ok:
                failures.append("next build")
    else:
        log.skip("3/5 next build: skipped (--no-build)")

    # Early exit if verification failed
    if failures:
        log.error(f"verification failed: {failures}; aborting before git writes")
        log.banner(f"build_and_push FAILED (total {time.perf_counter() - started:.1f}s)")
        sys.exit(1)

    # 4/5 git commit
    did_commit = False
    if args.commit_msg:
        with Stage(log, "4/5 git add + commit"):
            if args.dry_run:
                log.skip("  dry-run: would `git add -A`")
                log.skip(f"  dry-run: would `git commit -m \"{args.commit_msg[:60]}...\"`")
            else:
                if not run_stage(["git", "add", "-A"], "git add -A"):
                    failures.append("git add")
                else:
                    if not run_stage(["git", "commit", "-m", args.commit_msg], "git commit"):
                        # commit can fail with "nothing to commit" — check separately
                        log.warn("git commit rc != 0 (may be 'nothing to commit')")
                    else:
                        did_commit = True
    else:
        log.skip("4/5 git commit: skipped (no --commit-msg)")

    # 5/5 git push
    if args.no_push:
        log.skip("5/5 git push: skipped (--no-push)")
    elif args.dry_run:
        log.skip("5/5 git push: skipped (--dry-run)")
    else:
        with Stage(log, "5/5 git push"):
            if not run_stage(["git", "push"], "git push", timeout=120):
                failures.append("git push")

    elapsed = time.perf_counter() - started
    if failures:
        log.error(f"pipeline FAILED at: {failures}")
        log.banner(f"build_and_push FAILED ({elapsed:.1f}s)")
        sys.exit(1)

    log.banner(f"build_and_push OK ({elapsed:.1f}s){' [committed]' if did_commit else ''}")


if __name__ == "__main__":
    main()
