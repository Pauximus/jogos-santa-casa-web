@echo off
setlocal
set "SCRIPT_DIR=%~dp0"
for %%I in ("%SCRIPT_DIR%..") do set "PROJECT_DIR=%%~fI"

if not exist "%PROJECT_DIR%\app.js" (
  echo ERRO: nao encontrei app.js em:
  echo %PROJECT_DIR%
  pause
  exit /b 2
)

cd /d "%PROJECT_DIR%"
node "%SCRIPT_DIR%jsc-doctor.mjs" --root "%PROJECT_DIR%"
set "RESULTADO=%ERRORLEVEL%"
echo.
pause
exit /b %RESULTADO%
