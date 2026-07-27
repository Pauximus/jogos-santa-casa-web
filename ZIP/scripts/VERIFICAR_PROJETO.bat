@echo off
cd /d "%~dp0\.."
node scripts\verify-project.mjs
echo.
pause
