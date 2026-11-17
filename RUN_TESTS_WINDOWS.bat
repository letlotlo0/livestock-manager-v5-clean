@echo off
setlocal
cd /d "%~dp0backend"
where node >nul 2>nul
if errorlevel 1 (
  echo Install Node.js 20 or later first.
  pause
  exit /b 1
)
call npm run check
if errorlevel 1 (pause & exit /b 1)
call npm test
pause
