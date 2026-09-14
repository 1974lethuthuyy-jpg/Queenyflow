@echo off
chcp 65001 >nul
title Tao tai khoan admin
cd /d "%~dp0"
node tao-tai-khoan-admin.mjs
echo.
pause
