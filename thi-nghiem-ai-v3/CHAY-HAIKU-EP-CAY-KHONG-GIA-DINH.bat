@echo off
chcp 65001 >nul
title Thi nghiem AI - Claude Haiku, ep cay, khong gia dinh
cd /d "%~dp0"
if not exist node_modules\@anthropic-ai\sdk (
  echo Dang cai thu vien Claude lan dau...
  call npm install --no-audit --no-fund
  if errorlevel 1 (
    echo Cai thu vien that bai. Kiem tra mang Internet roi chay lai.
    pause
    exit /b 1
  )
)
node chay.mjs --claude --model claude-haiku-5-5 --ep-cay --khong-gia-dinh --so-buoc 100000 --toi-da-token 15000000
echo.
pause
