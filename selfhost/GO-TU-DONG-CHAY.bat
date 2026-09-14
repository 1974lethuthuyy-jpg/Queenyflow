@echo off
chcp 65001 >nul
title Tat tu chay server khi mo may
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0tu-dong-chay.ps1" -Remove
echo.
pause
