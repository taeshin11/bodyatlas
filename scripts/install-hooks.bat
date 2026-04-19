@echo off
REM One-time setup: point git at tracked hooks under .githooks/
cd /d "%~dp0.."
git config core.hooksPath .githooks
if errorlevel 1 (
    echo [install-hooks] FAILED to set core.hooksPath
    exit /b 1
)
echo [install-hooks] core.hooksPath = .githooks
echo [install-hooks] pre-commit ready
