@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Can Node.js 20 tro len. Cai Node roi mo lai file nay.
  pause
  exit /b 1
)
if not defined LOCAL_DUBBING_PORT set LOCAL_DUBBING_PORT=8787
start "" "http://127.0.0.1:%LOCAL_DUBBING_PORT%/"
node server.mjs
pause
