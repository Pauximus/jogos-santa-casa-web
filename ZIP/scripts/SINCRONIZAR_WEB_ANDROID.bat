@echo off
cd /d "%~dp0\.."
copy /Y app.js www\app.js >nul
copy /Y index.html www\index.html >nul
copy /Y style.css www\style.css >nul
if exist service-worker.js copy /Y service-worker.js www\service-worker.js >nul
if exist manifest.json copy /Y manifest.json www\manifest.json >nul
if exist manifest.webmanifest copy /Y manifest.webmanifest www\manifest.webmanifest >nul
call npx cap copy android
if errorlevel 1 goto erro
node scripts\verify-project.mjs
if errorlevel 1 goto erro
echo.
echo Ficheiros sincronizados e validados.
pause
exit /b 0
:erro
echo.
echo ERRO: a sincronizacao ou verificacao falhou.
pause
exit /b 1
