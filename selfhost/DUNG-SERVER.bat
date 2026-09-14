@echo off
chcp 65001 >nul
title Tat server Queeny Flow
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0dung-server.ps1"
echo.
pause
