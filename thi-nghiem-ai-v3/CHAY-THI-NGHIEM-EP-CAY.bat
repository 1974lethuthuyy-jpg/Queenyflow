@echo off
chcp 65001 >nul
title Thi nghiem AI - che do EP CAY
cd /d "%~dp0"
node chay.mjs --ep-cay %*
echo.
pause
