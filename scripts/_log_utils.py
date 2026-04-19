"""Structured logging utility for BodyAtlas automation scripts.

Features:
- Stage tracking with elapsed time
- Multi-level logging (DEBUG/INFO/WARN/ERROR/FATAL)
- Full traceback capture on errors
- Subprocess output capture (truncated on success, full on failure)
- Dual output: stdout + persistent log file (UTF-8)
- Optional ANSI color (auto-detected)
- Stage counter for "1/5: ..." style markers

Usage:
    from _log_utils import Logger, Stage

    log = Logger("my_script", log_file=Path("scripts/my_log.txt"))
    with Stage(log, "Loading model"):
        ...
    log.info("..."); log.warn("..."); log.error("...", exc=True)
"""
from __future__ import annotations

import datetime
import io
import os
import subprocess
import sys
import time
import traceback
from pathlib import Path
from typing import Optional


# Force UTF-8 stdout on Windows
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass


_LEVEL_TAGS = {
    "DEBUG": "DBG",
    "INFO":  "INF",
    "WARN":  "WRN",
    "ERROR": "ERR",
    "FATAL": "FTL",
    "STAGE": "STG",
    "OK":    " OK",
    "SKIP":  "SKP",
}

_LEVEL_COLORS = {
    "DEBUG": "\x1b[90m",
    "INFO":  "",
    "WARN":  "\x1b[33m",
    "ERROR": "\x1b[31m",
    "FATAL": "\x1b[1;31m",
    "STAGE": "\x1b[1;36m",
    "OK":    "\x1b[32m",
    "SKIP":  "\x1b[90m",
}
_RESET = "\x1b[0m"


def _supports_color() -> bool:
    if os.environ.get("NO_COLOR"):
        return False
    if not sys.stdout.isatty():
        return False
    return True


class Logger:
    """Structured logger writing to stdout + optional log file."""

    def __init__(
        self,
        name: str,
        log_file: Optional[Path] = None,
        min_level: str = "DEBUG",
        color: Optional[bool] = None,
    ):
        self.name = name
        self.log_file = log_file
        self.min_level = min_level
        self.color = _supports_color() if color is None else color
        self._stage_depth = 0
        self._level_order = ["DEBUG", "INFO", "WARN", "ERROR", "FATAL"]
        if log_file:
            log_file.parent.mkdir(parents=True, exist_ok=True)

    def _should_log(self, level: str) -> bool:
        if level in ("STAGE", "OK", "SKIP"):
            return True
        try:
            return self._level_order.index(level) >= self._level_order.index(self.min_level)
        except ValueError:
            return True

    def _emit(self, level: str, msg: str):
        if not self._should_log(level):
            return
        ts = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S.%f")[:-3]
        tag = _LEVEL_TAGS.get(level, level[:3])
        indent = "  " * self._stage_depth
        plain_line = f"[{ts}] [{tag}] {indent}{msg}"

        if self.color:
            color = _LEVEL_COLORS.get(level, "")
            colored_line = f"{color}{plain_line}{_RESET}" if color else plain_line
            print(colored_line, flush=True)
        else:
            print(plain_line, flush=True)

        if self.log_file:
            try:
                with open(self.log_file, "a", encoding="utf-8") as f:
                    f.write(plain_line + "\n")
            except Exception as e:
                print(f"[LOG-WRITE-FAIL] {e}", file=sys.stderr, flush=True)

    def debug(self, msg: str):
        self._emit("DEBUG", msg)

    def info(self, msg: str):
        self._emit("INFO", msg)

    def warn(self, msg: str):
        self._emit("WARN", msg)

    def ok(self, msg: str):
        self._emit("OK", msg)

    def skip(self, msg: str):
        self._emit("SKIP", msg)

    def error(self, msg: str, exc: bool = False):
        self._emit("ERROR", msg)
        if exc:
            tb = traceback.format_exc()
            for line in tb.rstrip().splitlines():
                self._emit("ERROR", "  " + line)

    def fatal(self, msg: str, exc: bool = True):
        self._emit("FATAL", msg)
        if exc:
            tb = traceback.format_exc()
            for line in tb.rstrip().splitlines():
                self._emit("FATAL", "  " + line)

    def kv(self, label: str, value):
        """Log a labeled key-value: 'CT shape: (512, 512, 431)'."""
        self.info(f"{label}: {value}")

    def banner(self, msg: str, char: str = "="):
        bar = char * 60
        self._emit("STAGE", bar)
        self._emit("STAGE", msg)
        self._emit("STAGE", bar)

    def stage_enter(self, name: str):
        self._emit("STAGE", f">>> {name}")
        self._stage_depth += 1

    def stage_exit(self, name: str, elapsed: float, ok: bool = True):
        self._stage_depth = max(0, self._stage_depth - 1)
        result = "OK" if ok else "FAIL"
        self._emit("STAGE", f"<<< {name} [{result}, {elapsed:.2f}s]")

    def run_subprocess(
        self,
        cmd: list,
        timeout: int = 1800,
        cwd: Optional[Path] = None,
        label: Optional[str] = None,
    ) -> bool:
        """Run a subprocess, log stdout/stderr appropriately.

        On success: log only last 10 lines of stdout.
        On failure: log full stdout + full stderr + return code.
        Returns True if returncode==0.
        """
        cmd_label = label or " ".join(str(c) for c in cmd[:3])
        self.info(f"subprocess: {cmd_label}")
        self.debug(f"  cmd: {cmd}")
        self.debug(f"  cwd: {cwd}")
        self.debug(f"  timeout: {timeout}s")

        start = time.perf_counter()
        try:
            result = subprocess.run(
                cmd,
                capture_output=True, text=True, timeout=timeout,
                cwd=str(cwd) if cwd else None,
                encoding="utf-8", errors="replace",
            )
        except subprocess.TimeoutExpired as e:
            elapsed = time.perf_counter() - start
            self.error(f"subprocess TIMEOUT after {elapsed:.1f}s (limit {timeout}s)")
            self.error(f"  partial stdout: {(e.stdout or '')[:500]}")
            self.error(f"  partial stderr: {(e.stderr or '')[:500]}")
            return False
        except Exception:
            elapsed = time.perf_counter() - start
            self.error(f"subprocess crashed after {elapsed:.1f}s", exc=True)
            return False

        elapsed = time.perf_counter() - start
        if result.returncode == 0:
            self.ok(f"subprocess OK ({elapsed:.2f}s, rc=0)")
            tail = "\n".join(result.stdout.rstrip().splitlines()[-10:])
            if tail:
                for line in tail.splitlines():
                    self.debug(f"  | {line}")
            return True
        else:
            self.error(f"subprocess FAILED ({elapsed:.2f}s, rc={result.returncode})")
            self.error("--- stdout ---")
            for line in (result.stdout or "").rstrip().splitlines():
                self.error(f"  | {line}")
            self.error("--- stderr ---")
            for line in (result.stderr or "").rstrip().splitlines():
                self.error(f"  | {line}")
            return False


class Stage:
    """Context manager for stage tracking with elapsed time."""

    def __init__(self, logger: Logger, name: str):
        self.logger = logger
        self.name = name
        self._start: float = 0.0

    def __enter__(self):
        self.logger.stage_enter(self.name)
        self._start = time.perf_counter()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        elapsed = time.perf_counter() - self._start
        ok = exc_type is None
        if not ok:
            self.logger.error(f"Stage '{self.name}' raised {exc_type.__name__}: {exc_val}")
            tb_str = "".join(traceback.format_exception(exc_type, exc_val, exc_tb))
            for line in tb_str.rstrip().splitlines():
                self.logger.error(f"  {line}")
        self.logger.stage_exit(self.name, elapsed, ok=ok)
        return False  # never suppress


def install_excepthook(logger: Logger):
    """Install a global exception hook that routes uncaught exceptions through logger."""
    def hook(exc_type, exc_val, exc_tb):
        logger.fatal(f"Uncaught {exc_type.__name__}: {exc_val}", exc=False)
        tb_str = "".join(traceback.format_exception(exc_type, exc_val, exc_tb))
        for line in tb_str.rstrip().splitlines():
            logger.fatal(f"  {line}", exc=False)
    sys.excepthook = hook
