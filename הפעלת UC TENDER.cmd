@echo off
title UC TENDER
echo.
echo   Starting UC TENDER...
echo   A window will open in a few seconds. You can minimize this black box.
echo.
cd /d "%~dp0desktop"
call npm start
