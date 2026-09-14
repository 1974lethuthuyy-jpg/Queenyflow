@echo off
chcp 65001 >nul
title Dat lai mat khau admin Queeny Flow
cd /d "%~dp0"
node tao-tai-khoan-admin.mjs --doi-mat-khau
echo.
pause
