@echo off
chcp 65001 >nul
title Bat tu chay server khi mo may
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0tu-dong-chay.ps1"
echo.
pause
