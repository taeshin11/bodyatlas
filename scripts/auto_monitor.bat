@echo off
REM BodyAtlas SPINAI Model Monitor — Windows Task Scheduler entry point.
REM Logs every shell-level event (start, cd, python exit code, finish) to
REM monitor_log.txt so failures at the batch layer are still traceable.

setlocal enableextensions
set ROOT=C:\NoAddsMakingApps\BodyAtlas
set LOGFILE=%ROOT%\scripts\monitor_log.txt
set PYTHON=C:\Users\taesh\Anaconda3\python.exe
set SCRIPT=%ROOT%\scripts\auto_model_monitor.py

echo. >> "%LOGFILE%"
echo ============================================ >> "%LOGFILE%"
echo [%date% %time%] [BAT] auto_monitor.bat START >> "%LOGFILE%"
echo [%date% %time%] [BAT] ROOT=%ROOT% >> "%LOGFILE%"
echo [%date% %time%] [BAT] PYTHON=%PYTHON% >> "%LOGFILE%"
echo [%date% %time%] [BAT] SCRIPT=%SCRIPT% >> "%LOGFILE%"

if not exist "%PYTHON%" (
    echo [%date% %time%] [BAT] [FATAL] python not found at %PYTHON% >> "%LOGFILE%"
    exit /b 2
)
if not exist "%SCRIPT%" (
    echo [%date% %time%] [BAT] [FATAL] monitor script not found at %SCRIPT% >> "%LOGFILE%"
    exit /b 3
)

cd /d "%ROOT%"
if errorlevel 1 (
    echo [%date% %time%] [BAT] [FATAL] cd failed errorlevel=%errorlevel% >> "%LOGFILE%"
    exit /b 4
)
echo [%date% %time%] [BAT] cwd=%CD% >> "%LOGFILE%"

echo [%date% %time%] [BAT] launching python... >> "%LOGFILE%"
"%PYTHON%" "%SCRIPT%" >> "%LOGFILE%" 2>&1
set RC=%errorlevel%

echo [%date% %time%] [BAT] python exit code=%RC% >> "%LOGFILE%"
echo [%date% %time%] [BAT] auto_monitor.bat END >> "%LOGFILE%"
echo ============================================ >> "%LOGFILE%"

exit /b %RC%
