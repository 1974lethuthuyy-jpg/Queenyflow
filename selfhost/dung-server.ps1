# Tat server Queeny Flow: cua so theo doi, ung dung, duong ham, database.
# Du lieu (khach hang, don hang...) van duoc giu nguyen.
Set-Location -Path $PSScriptRoot
$ErrorActionPreference = "Continue"

Write-Host "Dang tat server Queeny Flow..." -ForegroundColor Cyan

# 1. Tat cua so theo doi truoc, de no khong tu bat lai cac phan khac
Get-CimInstance Win32_Process -Filter "Name='powershell.exe'" |
  Where-Object { $_.CommandLine -like "*chay-server.ps1*" -and $_.ProcessId -ne $PID } |
  ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
Write-Host "[OK] Da tat cua so theo doi." -ForegroundColor Green

# 2. Ung dung (node tren cong 3000)
$owners = @()
try { $owners = @(Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction Stop | Select-Object -ExpandProperty OwningProcess -Unique) } catch {}
foreach ($ownerId in $owners) {
  $p = Get-Process -Id $ownerId -ErrorAction SilentlyContinue
  if ($p -and $p.ProcessName -eq "node") { & taskkill /PID $ownerId /T /F 2>&1 | Out-Null }
}
Write-Host "[OK] Da tat ung dung." -ForegroundColor Green

# 3. Duong ham cong khai
$exe = Join-Path $PSScriptRoot "cloudflared.exe"
Get-Process cloudflared -ErrorAction SilentlyContinue | Where-Object { $_.Path -eq $exe } |
  ForEach-Object { Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue }
Write-Host "[OK] Da tat duong ham cong khai." -ForegroundColor Green

# 4. Database
if (Test-Path "supabase\config.toml") {
  Write-Host "Dang tat database (du lieu van giu nguyen)..." -ForegroundColor Cyan
  & npx --yes supabase stop 2>&1 | ForEach-Object { Write-Host "$_" }
}

Write-Host ""
Write-Host "XONG. Muon bat lai: chay CHAY-SERVER.bat" -ForegroundColor Green
