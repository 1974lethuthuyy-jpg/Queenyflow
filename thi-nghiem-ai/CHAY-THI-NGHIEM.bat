@echo off
chcp 65001 >nul
title Thi nghiem AI - Nguoi chu da mat
cd /d "%~dp0"
node chay.mjs %*
echo.
pause
