@echo off
chcp 65001 >nul
title Queeny Flow - Server (DUNG DONG cua so nay)
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0chay-server.ps1"
echo.
echo ============================================================
echo   Server da dung theo doi. Neu thay chu mau do phia tren,
echo   chup man hinh gui cho Claude.
echo ============================================================
pause
