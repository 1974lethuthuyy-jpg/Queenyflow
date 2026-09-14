# Bat / tat che do tu chay server khi dang nhap Windows (loi tat trong thu muc Startup).
param([switch]$Remove)

$startup = [Environment]::GetFolderPath("Startup")
$shortcutPath = Join-Path $startup "Queeny Flow Server.lnk"

if ($Remove) {
  if (Test-Path $shortcutPath) {
    Remove-Item -Force $shortcutPath
    Write-Host "[OK] Da TAT che do tu chay khi mo may." -ForegroundColor Green
  } else {
    Write-Host "Che do tu chay khi mo may dang tat san." -ForegroundColor Yellow
  }
  exit 0
}

$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = Join-Path $env:SystemRoot "System32\WindowsPowerShell\v1.0\powershell.exe"
$shortcut.Arguments = "-NoProfile -ExecutionPolicy Bypass -File `"$(Join-Path $PSScriptRoot 'chay-server.ps1')`" -AutoStart"
$shortcut.WorkingDirectory = $PSScriptRoot
$shortcut.WindowStyle = 7
$shortcut.Description = "Tu khoi dong server Queeny Flow khi dang nhap Windows"
$shortcut.Save()

Write-Host "[OK] Da BAT che do tu chay server khi mo may." -ForegroundColor Green
Write-Host "Moi lan dang nhap Windows, server se tu chay (cua so thu nho o thanh taskbar)." -ForegroundColor Green
Write-Host "Muon tat che do nay: chay GO-TU-DONG-CHAY.bat" -ForegroundColor Cyan
