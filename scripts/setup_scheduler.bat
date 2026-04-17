@echo off
REM BodyAtlas 모델 모니터 스케줄러 등록
REM 관리자 권한으로 실행하세요

echo 매일 오전 9시에 SPINAI 모델 체크 스케줄 등록 중...

schtasks /create ^
  /tn "BodyAtlas_ModelMonitor" ^
  /tr "C:\NoAddsMakingApps\BodyAtlas\scripts\auto_monitor.bat" ^
  /sc daily ^
  /st 09:00 ^
  /rl HIGHEST ^
  /f

if %errorlevel% equ 0 (
    echo.
    echo ✅ 스케줄 등록 완료!
    echo    이름: BodyAtlas_ModelMonitor
    echo    실행: 매일 09:00
    echo    스크립트: auto_monitor.bat
    echo.
    echo 수동 실행 테스트:
    echo    schtasks /run /tn "BodyAtlas_ModelMonitor"
    echo.
    echo 삭제:
    echo    schtasks /delete /tn "BodyAtlas_ModelMonitor" /f
) else (
    echo ❌ 등록 실패 — 관리자 권한으로 다시 실행하세요
)

pause
