@echo off
title Guild Wars 2 Overlay (Web Browser / 2nd Monitor / OBS)
cd /d "%~dp0"
echo ========================================================
echo   GUILD WARS 2 - EVENT OVERLAY (Browser-Modus)
echo ========================================================
echo   Starte Dev-Server auf http://localhost:5188 ...
echo ========================================================
start http://localhost:5188
npm run dev
pause
