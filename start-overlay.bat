@echo off
title Omnitria • Guild Wars 2
cd /d "%~dp0"
cls
echo ===================================================================
echo   OMNITRIA - GUILD WARS 2 IN-GAME OVERLAY
echo ===================================================================
echo.
echo   [+] Launching Omnitria directly above game chat...
start "" "%~dp0node_modules\electron\dist\electron.exe" "."
echo   [+] Status: Omnitria launched successfully!
echo   [+] On your screen:
echo       - Omnitria hovers in the bottom-left above GW2 chat
echo       - Golden Dragon icon in Windows System Tray (next to clock)
echo.
echo   [+] Hotkeys:
echo       [Esc] : Minimize overlay back to Guild Wars 2
echo       [F9]  : Toggle overlay visibility (Show / Hide)
echo       [F10] : Toggle Click-Through mode
echo.
echo ===================================================================
echo   Press any key to close this terminal window.
echo   (The overlay continues running in the background!)
pause >nul
exit
