@echo off
REM BodyAtlas SPINAI Model Monitor — Windows Task Scheduler용
REM 매일 자동 실행: 모델 체크 → 기준 초과 시 atlas 재생성 → git push

set LOGFILE=C:\NoAddsMakingApps\BodyAtlas\scripts\monitor_log.txt
set PYTHON=C:\Users\taesh\Anaconda3\python.exe
set SCRIPT=C:\NoAddsMakingApps\BodyAtlas\scripts\auto_model_monitor.py

echo ============================================ >> %LOGFILE%
echo [%date% %time%] Monitor BAT started >> %LOGFILE%
echo ============================================ >> %LOGFILE%

cd /d C:\NoAddsMakingApps\BodyAtlas

%PYTHON% %SCRIPT% >> %LOGFILE% 2>&1

echo [%date% %time%] Monitor BAT finished >> %LOGFILE%
