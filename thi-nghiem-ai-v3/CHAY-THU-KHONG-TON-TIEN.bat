@echo off
chcp 65001 >nul
title Thi nghiem AI - chay thu (AI gia, khong ton tien)
cd /d "%~dp0"
node chay.mjs --gia-lap
echo.
pause
