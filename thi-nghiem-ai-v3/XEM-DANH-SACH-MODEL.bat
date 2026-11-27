@echo off
chcp 65001 >nul
title Danh sach model Gemini
cd /d "%~dp0"
node chay.mjs --danh-sach-model
echo.
pause
