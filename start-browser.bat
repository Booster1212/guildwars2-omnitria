@echo off
title Omnitria HUD (Web Browser / 2nd Monitor / OBS)
cd /d "%~dp0"
echo ========================================================
echo   OMNITRIA HUD - GUILD WARS 2 (Browser-Modus)
echo ========================================================
echo   Starte Dev-Server auf http://localhost:5188 ...
echo ========================================================
start http://localhost:5188
npm run dev
pause
