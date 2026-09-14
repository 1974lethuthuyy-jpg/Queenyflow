# Queeny Flow - khoi dong va GIU server chay lien tuc tren PC.
# Cua so nay tu kiem tra moi 30 giay: database, ung dung, duong ham cong khai.
# Cai nao bi tat se tu bat lai. Tat server: chay DUNG-SERVER.bat.
param(
  [switch]$AutoStart,    # chay tu dong khi mo may: khong mo trinh duyet, khong hoi Enter
  [switch]$SkipSupabase  # chi dung de kiem thu tren may khong co Docker
)

Set-Location -Path $PSScriptRoot
$ErrorActionPreference = "Continue"
$ProgressPreference = "SilentlyContinue"
try { [Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12 } catch {}
try { $Host.UI.RawUI.WindowTitle = "Queeny Flow - Server (DUNG DONG cua so nay)" } catch {}

$AppPort = 3000
$AppUrl = "http://localhost:$AppPort"
$CheckEverySec = 30
$LogDir = Join-Path $PSScriptRoot "logs"
New-Item -ItemType Directory -Force -Path $LogDir | Out-Null
$ServerLog = Join-Path $LogDir "server-log.txt"
$AppLog = Join-Path $LogDir "app-log.txt"
$LinkFile = Join-Path $PSScriptRoot "LINK-CONG-KHAI.txt"
$CloudflaredExe = Join-Path $PSScriptRoot "cloudflared.exe"
$LinkPattern = "https://[a-z0-9]+(?:-[a-z0-9]+)+\.trycloudflare\.com"
$Utf8NoBom = New-Object System.Text.UTF8Encoding($false)

$script:Sb = $null
$script:AppProc = $null
$script:AppFailCount = 0
$script:NextAppRestart = Get-Date
$script:SbFailCount = 0
$script:NextSbRestart = Get-Date
$script:TunnelProc = $null
$script:TunnelLink = $null
$script:TunnelStartedAt = Get-Date
$script:TunnelFailCount = 0
$script:NextTunnelRestart = Get-Date
$script:NextPublicCheck = Get-Date
$script:Monitoring = $false

# ---------------------------------------------------------------- tien ich

function Rotate-Log([string]$Path, [long]$MaxBytes) {
  if ((Test-Path $Path) -and ((Get-Item $Path).Length -gt $MaxBytes)) {
    Move-Item -Force -Path $Path -Destination "$Path.old" -ErrorAction SilentlyContinue
  }
}

function Log([string]$Message, [string]$Color = "Gray") {
  $line = "[{0}] {1}" -f (Get-Date -Format "dd/MM HH:mm:ss"), $Message
  Write-Host $line -ForegroundColor $Color
  try { [IO.File]::AppendAllText($ServerLog, $line + "`r`n", $Utf8NoBom) } catch {}
}

function Fail([string]$Message) {
  Log "============================================================" "Red"
  Log $Message "Red"
  Log "============================================================" "Red"
  if (-not $AutoStart) { Read-Host "Nhan Enter de dong" | Out-Null }
  exit 1
}

# Giu may khong tu ngu khi cua so nay dang chay (man hinh van tat binh thuong).
# Khong doi cai dat he thong - het tac dung khi dong cua so.
try {
  Add-Type -Namespace QueenyFlow -Name Power -ErrorAction Stop -MemberDefinition '[DllImport("kernel32.dll")] public static extern uint SetThreadExecutionState(uint esFlags);'
} catch {}
function Keep-Awake {
  # ES_CONTINUOUS | ES_SYSTEM_REQUIRED
  try { [QueenyFlow.Power]::SetThreadExecutionState([uint32]2147483649) | Out-Null } catch {}
}

function Test-Http([string]$Url, [hashtable]$Headers = @{}, [int]$TimeoutSec = 15) {
  try {
    $r = Invoke-WebRequest -Uri $Url -Headers $Headers -UseBasicParsing -TimeoutSec $TimeoutSec -ErrorAction Stop
    return ([int]$r.StatusCode -lt 500)
  } catch {
    $resp = $_.Exception.Response
    if ($null -ne $resp) {
      try { return ([int]$resp.StatusCode -lt 500) } catch { return $false }
    }
    return $false
  }
}

function Test-Internet {
  if (Test-Http "https://www.cloudflare.com/cdn-cgi/trace" -TimeoutSec 10) { return $true }
  return (Test-Http "http://www.gstatic.com/generate_204" -TimeoutSec 10)
}

function Invoke-Native([string]$Exe, [string[]]$NativeArgs) {
  $out = & $Exe @NativeArgs 2>&1 | ForEach-Object { "$_" } | Out-String
  return @{ Code = $LASTEXITCODE; Output = $out }
}

# ---------------------------------------------------------------- Docker + Supabase

function Test-Docker {
  if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    $bin = Join-Path $env:ProgramFiles "Docker\Docker\resources\bin"
    if (-not (Test-Path (Join-Path $bin "docker.exe"))) { return $false }
    $env:PATH = "$bin;$env:PATH"
  }
  & docker info *> $null
  return ($LASTEXITCODE -eq 0)
}

function Get-DockerDesktopExe {
  $exe = Join-Path $env:ProgramFiles "Docker\Docker\Docker Desktop.exe"
  if (Test-Path $exe) { return $exe }
  return $null
}

function Ensure-Docker {
  if (Test-Docker) { return $true }
  $exe = Get-DockerDesktopExe
  if (-not $exe) { return $false }
  if (-not (Get-Process "Docker Desktop" -ErrorAction SilentlyContinue)) {
    Log "Docker Desktop chua chay - dang mo Docker Desktop..." "Yellow"
    Start-Process -FilePath $exe | Out-Null
  } else {
    Log "Dang doi Docker Desktop khoi dong xong..." "Yellow"
  }
  for ($i = 0; $i -lt 60; $i++) {
    Start-Sleep -Seconds 5
    if (Test-Docker) { Log "[OK] Docker da san sang." "Green"; return $true }
  }
  return $false
}

# Ban cai moi (thu muc moi) tu dung lai du lieu cua lan cai gan nhat tren may,
# thay vi tao database trong - tranh "mat tai khoan" moi lan cap nhat ban moi.
function Get-ExistingProjectId {
  try {
    $rows = & docker ps -a --filter "name=supabase_db_" --format "{{.CreatedAt}}|{{.Names}}" 2>$null
    $latest = @($rows | Where-Object { $_ -match "\|supabase_db_" } | Sort-Object) | Select-Object -Last 1
    if ($latest) { return ($latest -split "\|supabase_db_", 2)[1].Trim() }
    $vols = & docker volume ls --filter "name=supabase_db_" --format "{{.Name}}" 2>$null
    $vol = @($vols | Where-Object { $_ -like "supabase_db_*" } | Sort-Object) | Select-Object -Last 1
    if ($vol) { return $vol.Substring("supabase_db_".Length).Trim() }
  } catch {}
  return $null
}

function Initialize-SupabaseConfig {
  if (Test-Path "supabase\config.toml") { return }
  Log "Dang khoi tao cau hinh Supabase..." "Cyan"
  $r = Invoke-Native "npx" @("--yes", "supabase", "init", "--workdir", ".")
  if (-not (Test-Path "supabase\config.toml")) { Log $r.Output.Trim() "DarkGray"; return }
  $projectId = Get-ExistingProjectId
  if ($projectId) {
    Log "Dung lai du lieu da co tren may (du an: $projectId)." "Green"
  } else {
    $projectId = "queenyflow"
  }
  $cfgPath = Join-Path $PSScriptRoot "supabase\config.toml"
  $text = [IO.File]::ReadAllText($cfgPath)
  $text = [regex]::Replace($text, '(?m)^project_id\s*=\s*".*"', "project_id = `"$projectId`"")
  [IO.File]::WriteAllText($cfgPath, $text, $Utf8NoBom)
}

function Start-Supabase {
  Log "Dang khoi dong database (Supabase)..." "Cyan"
  $r = Invoke-Native "npx" @("--yes", "supabase", "start")
  if ($r.Code -ne 0 -and $r.Output -match "already allocated|port is already") {
    Log "Cong database dang bi mot ban Supabase cu chiem - tat ban cu (du lieu van giu nguyen)..." "Yellow"
    Invoke-Native "npx" @("--yes", "supabase", "stop", "--all") | Out-Null
    $r = Invoke-Native "npx" @("--yes", "supabase", "start")
  }
  if ($r.Code -ne 0) {
    Log $r.Output.Trim() "DarkGray"
    return $false
  }
  $m = Invoke-Native "npx" @("--yes", "supabase", "migration", "up", "--local")
  if ($m.Code -ne 0) { Log ("Canh bao - cap nhat cau truc database chua xong: " + $m.Output.Trim()) "Yellow" }
  Log "[OK] Database dang chay." "Green"
  return $true
}

function Clean-Value($Value) {
  if ($null -eq $Value) { return $null }
  $s = $Value.ToString().Trim().Trim('"').Trim("'").Trim()
  if ($s -eq "") { return $null }
  return $s
}

function Get-JsonField($Object, [string[]]$Names) {
  foreach ($name in $Names) {
    $prop = $Object.PSObject.Properties | Where-Object { $_.Name -eq $name } | Select-Object -First 1
    if ($prop) {
      $value = Clean-Value $prop.Value
      if ($value) { return $value }
    }
  }
  return $null
}

function Get-FirstMatch([string]$Text, [string[]]$Patterns) {
  foreach ($pattern in $Patterns) {
    $m = [regex]::Match($Text, $pattern)
    if ($m.Success) { return (Clean-Value $m.Groups[1].Value) }
  }
  return $null
}

function Get-SupabaseInfo {
  $apiUrl = $null; $anonKey = $null; $serviceKey = $null
  $r = Invoke-Native "npx" @("--yes", "supabase", "status", "-o", "json")
  try {
    $start = $r.Output.IndexOf("{")
    $end = $r.Output.LastIndexOf("}")
    $parsed = $r.Output.Substring($start, $end - $start + 1) | ConvertFrom-Json -ErrorAction Stop
    # Chon dung ten truong - tranh nham JWT_SECRET hay S3_..._SECRET thanh khoa quan tri
    $apiUrl = Get-JsonField $parsed @("API_URL")
    $anonKey = Get-JsonField $parsed @("PUBLISHABLE_KEY", "ANON_KEY")
    $serviceKey = Get-JsonField $parsed @("SECRET_KEY", "SERVICE_ROLE_KEY")
  } catch {}

  if (-not $apiUrl -or -not $anonKey -or -not $serviceKey) {
    $text = (Invoke-Native "npx" @("--yes", "supabase", "status")).Output
    if (-not $anonKey) { $anonKey = Get-FirstMatch $text @("(sb_publishable_\S+)", "anon key:\s*(\S+)") }
    if (-not $serviceKey) { $serviceKey = Get-FirstMatch $text @("(sb_secret_\S+)", "service_role key:\s*(\S+)") }
    if (-not $apiUrl) {
      $m = [regex]::Match($text, "127\.0\.0\.1:(\d+)/(?:rest|functions|storage)/v1")
      if ($m.Success) { $apiUrl = "http://127.0.0.1:" + $m.Groups[1].Value }
    }
  }

  if (-not $apiUrl -or -not $anonKey -or -not $serviceKey) { return $null }
  return @{ ApiUrl = $apiUrl.TrimEnd("/"); AnonKey = $anonKey; ServiceKey = $serviceKey }
}

# Ghi .env.local, tra ve $true neu noi dung thay doi (khi do can build lai).
function Write-EnvFile($Info) {
  $content = "NEXT_PUBLIC_SUPABASE_URL=$($Info.ApiUrl)`nNEXT_PUBLIC_SUPABASE_ANON_KEY=$($Info.AnonKey)`nSUPABASE_SERVICE_ROLE_KEY=$($Info.ServiceKey)`nNEXT_PUBLIC_SUPABASE_PROXY=1`nEMPLOYEE_EMAIL_DOMAIN=employees.queenyflow.local`n"
  $path = Join-Path $PSScriptRoot ".env.local"
  $old = if (Test-Path $path) { [IO.File]::ReadAllText($path) } else { "" }
  if ($old -eq $content) { return $false }
  [IO.File]::WriteAllText($path, $content, $Utf8NoBom)
  return $true
}

function Test-Supabase {
  if (-not $script:Sb) { return $false }
  return (Test-Http "$($script:Sb.ApiUrl)/rest/v1/organizations?select=id&limit=1" -Headers @{ apikey = $script:Sb.AnonKey })
}

# ---------------------------------------------------------------- thu vien + build

function Ensure-NodeModules {
  $lockHash = (Get-FileHash "package-lock.json" -Algorithm SHA256).Hash
  $marker = "node_modules\.qf-lock-hash"
  if ((Test-Path $marker) -and ((Get-Content $marker -Raw).Trim() -eq $lockHash)) { return $true }
  Log "Dang cai dat thu vien (lan dau hoac khi co ban moi, co the mat vai phut)..." "Cyan"
  & npm install 2>&1 | ForEach-Object { Write-Host "$_" }
  if ($LASTEXITCODE -ne 0) { return $false }
  $lockHash = (Get-FileHash "package-lock.json" -Algorithm SHA256).Hash
  Set-Content -Path $marker -Value $lockHash
  return $true
}

function Get-BuildFingerprint {
  $files = @()
  foreach ($dir in @("src", "public")) {
    if (Test-Path $dir) { $files += @(Get-ChildItem $dir -Recurse -File) }
  }
  foreach ($f in @("package-lock.json", "next.config.ts", "tsconfig.json", "postcss.config.mjs", ".env.local")) {
    if (Test-Path $f) { $files += @(Get-Item $f) }
  }
  $sb = New-Object System.Text.StringBuilder
  foreach ($f in ($files | Sort-Object FullName)) {
    $rel = $f.FullName.Substring($PSScriptRoot.Length)
    [void]$sb.AppendLine($rel + "|" + (Get-FileHash $f.FullName -Algorithm SHA256).Hash)
  }
  $sha = [Security.Cryptography.SHA256]::Create()
  return [BitConverter]::ToString($sha.ComputeHash([Text.Encoding]::UTF8.GetBytes($sb.ToString()))).Replace("-", "")
}

function Test-BuildCurrent {
  $marker = ".next\qf-build-hash.txt"
  if (-not (Test-Path ".next\BUILD_ID") -or -not (Test-Path $marker)) { return $false }
  return ((Get-Content $marker -Raw).Trim() -eq (Get-BuildFingerprint))
}

function Invoke-Build {
  Log "Dang build ung dung (1-2 phut)..." "Cyan"
  $fingerprint = Get-BuildFingerprint
  & npm run build 2>&1 | ForEach-Object { Write-Host "$_" }
  if ($LASTEXITCODE -ne 0) { return $false }
  Set-Content -Path ".next\qf-build-hash.txt" -Value $fingerprint
  Log "[OK] Build xong." "Green"
  return $true
}

# ---------------------------------------------------------------- ung dung (cong 3000)

function Stop-App {
  if ($script:AppProc) {
    & taskkill /PID $script:AppProc.Id /T /F 2>&1 | Out-Null
    $script:AppProc = $null
  }
  $owners = @()
  try { $owners = @(Get-NetTCPConnection -LocalPort $AppPort -State Listen -ErrorAction Stop | Select-Object -ExpandProperty OwningProcess -Unique) } catch {}
  foreach ($ownerId in $owners) {
    $p = Get-Process -Id $ownerId -ErrorAction SilentlyContinue
    if ($p -and $p.ProcessName -eq "node") {
      & taskkill /PID $ownerId /T /F 2>&1 | Out-Null
    } elseif ($p) {
      Log "Cong $AppPort dang bi chuong trinh '$($p.ProcessName)' chiem - hay tat chuong trinh do." "Red"
    }
  }
  Start-Sleep -Seconds 2
}

function Start-App {
  Log "Dang khoi dong ung dung tren cong $AppPort..." "Cyan"
  Rotate-Log $AppLog 10MB
  $script:AppProc = Start-Process -FilePath "cmd.exe" -ArgumentList "/c npm run start >> `"$AppLog`" 2>&1" -WorkingDirectory $PSScriptRoot -WindowStyle Hidden -PassThru
  for ($i = 0; $i -lt 45; $i++) {
    Start-Sleep -Seconds 2
    if (Test-Http "$AppUrl/dang-nhap") {
      Log "[OK] Ung dung dang chay: $AppUrl" "Green"
      $script:AppFailCount = 0
      return $true
    }
    if ($script:AppProc.HasExited) { break }
  }
  Log "Ung dung chua chay duoc (xem logs\app-log.txt)." "Red"
  return $false
}

function Check-App {
  if (Test-Http "$AppUrl/dang-nhap") {
    $script:AppFailCount = 0
    return $true
  }
  $script:AppFailCount++
  if ($script:AppFailCount -lt 2 -or (Get-Date) -lt $script:NextAppRestart) { return $false }
  Log "Ung dung khong phan hoi - dang khoi dong lai..." "Yellow"
  $script:NextAppRestart = (Get-Date).AddMinutes(2)
  Stop-App
  return (Start-App)
}

# ---------------------------------------------------------------- duong ham cong khai

function Get-SavedLink {
  if (-not (Test-Path $LinkFile)) { return $null }
  $m = [regex]::Match((Get-Content $LinkFile -Raw), $LinkPattern)
  if ($m.Success) { return $m.Value }
  return $null
}

function Show-LinkPopup([string]$Link) {
  if ($SkipSupabase) { return }
  $msg = "Link cong khai cua Queeny Flow vua DOI thanh:`n`n$Link`n`nHay gui link moi nay cho nhan vien.`n(Link cung duoc luu trong file LINK-CONG-KHAI.txt)"
  $cmd = "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.MessageBox]::Show('" + $msg.Replace("'", "''") + "', 'Queeny Flow - Link moi', 'OK', 'Information') | Out-Null"
  $encoded = [Convert]::ToBase64String([Text.Encoding]::Unicode.GetBytes($cmd))
  Start-Process powershell -ArgumentList "-NoProfile -WindowStyle Hidden -EncodedCommand $encoded" | Out-Null
}

function Save-Link([string]$Link) {
  $old = Get-SavedLink
  $content = "$Link`r`n`r`nCap nhat luc: " + (Get-Date -Format "HH:mm dd/MM/yyyy") + "`r`nLink nay DOI moi khi duong ham phai mo lai. Luon gui link moi nhat trong file nay cho nhan vien.`r`n"
  [IO.File]::WriteAllText($LinkFile, $content, $Utf8NoBom)
  Log "============================================================" "Green"
  Log "  LINK CONG KHAI (gui cho nhan vien): $Link" "Yellow"
  Log "============================================================" "Green"
  # Bao cho chu cua hang khi link doi luc khong ngoi truoc may (tu khoi dong / dang theo doi)
  if ($old -and $old -ne $Link -and ($AutoStart -or $script:Monitoring)) { Show-LinkPopup $Link }
}

function Get-OurCloudflared {
  return @(Get-Process cloudflared -ErrorAction SilentlyContinue | Where-Object { $_.Path -eq $CloudflaredExe })
}

function Stop-Tunnel {
  if ($script:TunnelProc) { Stop-Process -Id $script:TunnelProc.Id -Force -ErrorAction SilentlyContinue }
  foreach ($p in (Get-OurCloudflared)) { Stop-Process -Id $p.Id -Force -ErrorAction SilentlyContinue }
  $script:TunnelProc = $null
  Start-Sleep -Seconds 1
}

function Ensure-Cloudflared {
  if (Test-Path $CloudflaredExe) { return $true }
  Log "Dang tai Cloudflare Tunnel (mot lan duy nhat)..." "Cyan"
  try {
    Invoke-WebRequest -Uri "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe" -OutFile "$CloudflaredExe.part" -UseBasicParsing -ErrorAction Stop
    Move-Item -Force "$CloudflaredExe.part" $CloudflaredExe
    return $true
  } catch {
    Log "Khong tai duoc Cloudflare Tunnel: $($_.Exception.Message)" "Red"
    return $false
  }
}

function Start-Tunnel {
  $script:NextTunnelRestart = (Get-Date).AddMinutes(1)
  if (-not (Ensure-Cloudflared)) { return $false }
  Stop-Tunnel
  Log "Dang mo duong ham cong khai..." "Cyan"
  Get-ChildItem $LogDir -Filter "tunnel-*.txt" -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending | Select-Object -Skip 5 | Remove-Item -Force -ErrorAction SilentlyContinue
  $tunnelLog = Join-Path $LogDir ("tunnel-{0}.txt" -f (Get-Date -Format "yyyyMMdd-HHmmss"))
  $script:TunnelProc = Start-Process -FilePath $CloudflaredExe -ArgumentList "tunnel --no-autoupdate --url $AppUrl" -RedirectStandardError $tunnelLog -WindowStyle Hidden -PassThru

  $link = $null
  for ($i = 0; $i -lt 30; $i++) {
    Start-Sleep -Seconds 2
    $text = Get-Content -Path $tunnelLog -Raw -ErrorAction SilentlyContinue
    if ($text) {
      $m = [regex]::Match($text, $LinkPattern)
      if ($m.Success) { $link = $m.Value }
      if ($link -and $text -match "Registered tunnel connection") { break }
    }
    if ($script:TunnelProc.HasExited) { break }
  }

  if (-not $link -or $script:TunnelProc.HasExited) {
    Log "Khong mo duoc duong ham cong khai (xem $tunnelLog). Se thu lai sau." "Red"
    Stop-Tunnel
    return $false
  }
  $script:TunnelLink = $link
  $script:TunnelStartedAt = Get-Date
  $script:TunnelFailCount = 0
  Save-Link $link
  return $true
}

function Check-Tunnel {
  if (-not $script:TunnelProc -or $script:TunnelProc.HasExited) {
    if ((Get-Date) -lt $script:NextTunnelRestart) { return }
    Log "Duong ham cong khai bi tat - dang mo lai..." "Yellow"
    Start-Tunnel | Out-Null
    return
  }
  # Doi duong ham on dinh 2 phut roi moi kiem tra tu ben ngoai (ten mien moi can thoi gian cap nhat)
  if (((Get-Date) - $script:TunnelStartedAt).TotalSeconds -lt 120) { return }
  if ((Get-Date) -lt $script:NextPublicCheck) { return }
  $script:NextPublicCheck = (Get-Date).AddSeconds(90)

  if (Test-Http "$($script:TunnelLink)/dang-nhap" -TimeoutSec 20) {
    if ($script:TunnelFailCount -gt 0) { Log "[OK] Link cong khai hoat dong tro lai." "Green" }
    $script:TunnelFailCount = 0
    return
  }
  if (-not (Test-Internet)) {
    Log "Mat ket noi internet - doi mang tro lai (giu nguyen link)." "Yellow"
    return
  }
  $script:TunnelFailCount++
  Log "Link cong khai khong vao duoc (lan $($script:TunnelFailCount)/4)." "Yellow"
  if ($script:TunnelFailCount -ge 4) {
    Log "Duong ham da hong - tao duong ham moi (link se doi)..." "Yellow"
    Start-Tunnel | Out-Null
  }
}

function Check-Supabase {
  if (Test-Supabase) {
    $script:SbFailCount = 0
    return
  }
  $script:SbFailCount++
  if ($script:SbFailCount -lt 3 -or (Get-Date) -lt $script:NextSbRestart) { return }
  Log "Database khong phan hoi - dang khoi dong lai..." "Yellow"
  $script:NextSbRestart = (Get-Date).AddMinutes(5)
  if (-not (Ensure-Docker)) { Log "Docker chua chay duoc - se thu lai sau." "Red"; return }
  if (-not (Start-Supabase)) { return }
  $info = Get-SupabaseInfo
  if (-not $info) { return }
  $script:Sb = $info
  $script:SbFailCount = 0
  if (Write-EnvFile $info) {
    Log "Thong tin ket noi database da thay doi - build lai ung dung..." "Yellow"
    Stop-App
    if (Invoke-Build) { Start-App | Out-Null }
  }
}

# ---------------------------------------------------------------- chuong trinh chinh

$mutex = New-Object System.Threading.Mutex($false, "Local\QueenyFlowServer")
$ownsMutex = $false
try { $ownsMutex = $mutex.WaitOne(0) } catch { $ownsMutex = $true }
if (-not $ownsMutex) {
  Write-Host "Server Queeny Flow DANG CHAY o mot cua so khac roi, khong can mo them." -ForegroundColor Yellow
  $saved = Get-SavedLink
  if ($saved) { Write-Host "Link cong khai hien tai: $saved" -ForegroundColor Yellow }
  if (-not $AutoStart) { Read-Host "Nhan Enter de dong" | Out-Null }
  exit 0
}

try {
  Rotate-Log $ServerLog 5MB
  Log "=== Queeny Flow - Server tu host tren PC ===" "Cyan"
  Keep-Awake

  if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Fail "CHUA CAI NODE.JS. Tai tai https://nodejs.org (chon ban LTS), cai xong roi chay lai."
  }

  if ($SkipSupabase) {
    Log "(Che do kiem thu: bo qua Docker/Supabase)" "DarkGray"
  } else {
    if (-not (Ensure-Docker)) {
      if (-not (Get-DockerDesktopExe)) {
        Fail "CHUA CAI DOCKER DESKTOP. Tai tai https://www.docker.com/products/docker-desktop, cai xong mo len roi chay lai."
      }
      Fail "Docker Desktop khong khoi dong duoc sau 5 phut. Mo Docker Desktop, doi bieu tuong ca voi on dinh roi chay lai."
    }
    Initialize-SupabaseConfig
    if (-not (Start-Supabase)) {
      Fail "Khong khoi dong duoc database (xem loi phia tren). Kiem tra Docker Desktop dang chay va thu lai."
    }
    $script:Sb = Get-SupabaseInfo
    if (-not $script:Sb) {
      Fail "Khong doc duoc thong tin ket noi database. Chup man hinh gui cho Claude de kiem tra."
    }
    Write-EnvFile $script:Sb | Out-Null
    Log "[OK] Database: $($script:Sb.ApiUrl)" "Green"
  }

  if (-not (Ensure-NodeModules)) {
    Fail "Cai dat thu vien bi loi (xem phia tren). Chup man hinh gui cho Claude de kiem tra."
  }

  Stop-App
  if (Test-BuildCurrent) {
    Log "[OK] Ban build da moi nhat, bo qua buoc build." "Green"
  } elseif (-not (Invoke-Build)) {
    Fail "Build ung dung bi loi (xem phia tren). Chup man hinh gui cho Claude de kiem tra."
  }
  Start-App | Out-Null

  # Giu lai duong ham dang chay tu lan truoc (neu con tot) de khong doi link
  $saved = Get-SavedLink
  $existing = Get-OurCloudflared | Select-Object -First 1
  if ($existing -and $saved -and (Test-Http "$saved/dang-nhap" -TimeoutSec 20)) {
    $script:TunnelProc = $existing
    $script:TunnelLink = $saved
    $script:TunnelStartedAt = (Get-Date).AddMinutes(-5)
    Log "[OK] Duong ham cong khai dang chay san, giu nguyen link: $saved" "Green"
  } else {
    Start-Tunnel | Out-Null
  }

  if (-not $AutoStart) {
    Start-Process $AppUrl
    Log "Neu day la lan dau, chay TAO-TAI-KHOAN-ADMIN.bat de tao tai khoan admin." "Cyan"
  }
  Log "Server dang chay. Cua so nay tu kiem tra moi $CheckEverySec giay va tu bat lai neu co gi bi tat." "Cyan"
  Log "Muon TAT server: chay DUNG-SERVER.bat. Co the thu nho cua so nay, DUNG DONG." "Cyan"

  $script:Monitoring = $true
  $nextHeartbeat = (Get-Date).AddMinutes(10)
  while ($true) {
    Start-Sleep -Seconds $CheckEverySec
    Keep-Awake
    try {
      if (-not $SkipSupabase) { Check-Supabase }
      if (Check-App) { Check-Tunnel }
      if ((Get-Date) -ge $nextHeartbeat) {
        Log "Dang chay binh thuong. Link: $($script:TunnelLink)" "DarkGray"
        $nextHeartbeat = (Get-Date).AddMinutes(10)
      }
    } catch {
      Log "Loi trong luc kiem tra: $($_.Exception.Message)" "Red"
    }
  }
} catch {
  Log "LOI KHONG XAC DINH: $($_.Exception.Message)" "Red"
  Log $_.ScriptStackTrace "Red"
  if (-not $AutoStart) { Read-Host "Nhan Enter de dong" | Out-Null }
}
