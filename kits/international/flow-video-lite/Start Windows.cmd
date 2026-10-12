@echo off
cd /d "%~dp0"
node scripts\kit.mjs doctor
echo.
echo Ask your AI agent to read skills/windi-flow-video-lite/SKILL.md.
echo First installation: npm ci. Preview: npm run preview.
pause
