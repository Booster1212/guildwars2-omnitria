@echo off
title Omnitria • Guild Wars 2
cd /d "%~dp0"
cls
echo ===================================================================
echo   OMNITRIA - GUILD WARS 2 EVENT, HANDWERK ^& LEGENDAR
echo ===================================================================
echo.
echo   [+] Starte Omnitria direkt ueber dem Chat...
start "" "%~dp0node_modules\electron\dist\electron.exe" "."
echo   [+] Status: Omnitria wurde gestartet!
echo   [+] Schau auf deinen Bildschirm:
echo       - Omnitria schwebt unten links ueber dem GW2-Chat
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
