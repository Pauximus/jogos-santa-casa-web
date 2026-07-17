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

echo ========================================
echo   SINCRONIZAR + JSC DOCTOR V4 FINAL
echo ========================================
echo.

node "%SCRIPT_DIR%jsc-doctor.mjs" --fix --root "%PROJECT_DIR%"
set "RESULTADO=%ERRORLEVEL%"

echo.
if not "%RESULTADO%"=="0" (
  echo ERRO: a sincronizacao ou verificacao falhou.
  pause
  exit /b %RESULTADO%
)

echo Projeto sincronizado e validado.
pause
exit /b 0
