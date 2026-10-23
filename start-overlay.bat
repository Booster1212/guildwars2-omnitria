@echo off
title Omnitria HUD • Guild Wars 2
cd /d "%~dp0"
cls
echo ===================================================================
echo   OMNITRIA HUD - GUILD WARS 2 EVENT, HANDWERK ^& LEGENDAR
echo ===================================================================
echo.
echo   [+] Starte Omnitria HUD direkt ueber dem Chat...
start "" "%~dp0node_modules\electron\dist\electron.exe" "."
echo   [+] Status: Omnitria HUD wurde gestartet!
echo   [+] Schau auf deinen Bildschirm:
echo       - Omnitria HUD schwebt unten links ueber dem GW2-Chat
echo       - Goldener Drache im Windows System-Tray (neben der Uhr)
echo.
echo   [+] Hotkeys:
echo       [F9]  : Overlay ein- / ausblenden
echo       [F10] : Klick-Durchlaessig (Click-Through)
echo.
echo ===================================================================
echo   Druecke eine Taste zum Schliessen dieses Fensters.
echo   (Das Overlay laeuft im Hintergrund weiter!)
pause >nul
exit
