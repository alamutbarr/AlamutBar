param(
  [switch]$Repair,
  [int]$UsePort = 0,
  [string]$XamppRoot = ""
)

$ErrorActionPreference = "Stop"

function Find-XamppRoot {
  if ($XamppRoot -and (Test-Path $XamppRoot)) { return (Resolve-Path $XamppRoot).Path }
  if ($env:XAMPP_HOME -and (Test-Path $env:XAMPP_HOME)) { return $env:XAMPP_HOME }
  foreach ($candidate in @("C:\xampp", "D:\xampp", "C:\XAMPP", "D:\XAMPP")) {
    if (Test-Path $candidate) { return $candidate }
  }
  throw "پوشه زمپ پیدا نشد. مسیر را با -XamppRoot بدهید، مثلاً -XamppRoot C:\xampp"
}

function Get-PortOwner([int]$Port) {
  $lines = netstat -ano | Select-String ":$Port\s"
  $pids = @()
  foreach ($line in $lines) {
    $parts = ($line.ToString() -split "\s+") | Where-Object { $_ -ne "" }
    if ($parts.Length -ge 5) { $pids += $parts[-1] }
  }
  $pids = $pids | Where-Object { $_ -and $_ -ne "0" } | Select-Object -Unique
  foreach ($procId in $pids) {
    $proc = Get-Process -Id $procId -ErrorAction SilentlyContinue
    if ($proc) {
      Write-Host ("پورت {0} در اختیار PID {1} ({2}) است." -f $Port, $procId, $proc.ProcessName)
    } else {
      Write-Host ("پورت {0} در اختیار PID {1} است." -f $Port, $procId)
    }
  }
  return $pids
}

function Stop-XamppMysql($root) {
  $mysqladmin = Join-Path $root "mysql\bin\mysqladmin.exe"
  if (Test-Path $mysqladmin) {
    & $mysqladmin -u root shutdown 2>$null | Out-Null
    Start-Sleep -Seconds 2
  }
  Get-Process mysqld, mysql -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
}

function Show-ErrorLog($root) {
  $logDir = Join-Path $root "mysql\data"
  if (-not (Test-Path $logDir)) { return }
  $log = Get-ChildItem $logDir -Filter "*.err" | Sort-Object LastWriteTime -Descending | Select-Object -First 1
  if (-not $log) { return }
  Write-Host ""
  Write-Host ("--- انتهای لاگ {0} ---" -f $log.Name)
  Get-Content $log.FullName -Tail 40
}

$root = Find-XamppRoot
$data = Join-Path $root "mysql\data"
$backup = Join-Path $root "mysql\backup"
$myIni = Join-Path $root "mysql\bin\my.ini"
$projectEnv = Join-Path (Split-Path $PSScriptRoot -Parent) ".env"

Write-Host ("زمپ: {0}" -f $root)
if (Test-Path $myIni) {
  $portLine = Select-String -Path $myIni -Pattern "^\s*port\s*=" | Select-Object -First 1
  if ($portLine) { Write-Host ("my.ini: {0}" -f $portLine.Line.Trim()) }
}

Write-Host "بررسی پورت 3306..."
$owners = Get-PortOwner 3306
$windowsMysql = Get-Service -Name "MySQL*" -ErrorAction SilentlyContinue | Where-Object { $_.Status -eq "Running" }
if ($windowsMysql) {
  Write-Host "سرویس MySQL ویندوز روشن است و معمولاً همان پورت زمپ را می‌گیرد:"
  $windowsMysql | ForEach-Object { Write-Host ("  {0} ({1})" -f $_.Name, $_.Status) }
}

Show-ErrorLog $root

if (-not $Repair -and $UsePort -eq 0) {
  Write-Host ""
  Write-Host "تشخیص تمام شد. این اسکریپت هنوز چیزی را عوض نکرده است."
  Write-Host "تعمیر پوشه data (با پشتیبان):"
  Write-Host "  powershell -ExecutionPolicy Bypass -File scripts/fix-xampp-mysql.ps1 -Repair"
  if ($owners -or $windowsMysql) {
    Write-Host "اگر پورت 3306 اشغال است، MySQL زمپ را روی 3307 بیاورید:"
    Write-Host "  powershell -ExecutionPolicy Bypass -File scripts/fix-xampp-mysql.ps1 -UsePort 3307"
  }
  exit 0
}

if ($UsePort -gt 0) {
  if (-not (Test-Path $myIni)) { throw "my.ini پیدا نشد." }
  Copy-Item $myIni "$myIni.bak-$(Get-Date -Format 'yyyyMMdd-HHmmss')" -Force
  $ini = Get-Content $myIni -Raw
  $ini = [regex]::Replace($ini, "(?m)^(\s*port\s*=\s*)\d+", "`${1}$UsePort")
  Set-Content -Path $myIni -Value $ini -Encoding ASCII
  if (Test-Path $projectEnv) {
    $envText = Get-Content $projectEnv -Raw
    if ($envText -match "(?m)^DB_PORT=") {
      $envText = [regex]::Replace($envText, "(?m)^DB_PORT=.*$", "DB_PORT=$UsePort")
    } else {
      $envText = $envText.TrimEnd() + "`r`nDB_PORT=$UsePort`r`n"
    }
    Set-Content -Path $projectEnv -Value $envText -Encoding UTF8
  }
  Write-Host ("پورت MySQL زمپ و DB_PORT پروژه روی {0} تنظیم شد. MySQL را از کنترل‌پنل زمپ Start کنید." -f $UsePort)
}

if ($Repair) {
  if (-not (Test-Path $backup)) { throw "پوشه mysql\backup زمپ پیدا نشد. بدون آن تعمیر خودکار ممکن نیست." }
  Stop-XamppMysql $root
  $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
  $broken = Join-Path $root ("mysql\data-broken-{0}" -f $stamp)
  if (Test-Path $data) { Rename-Item $data $broken }
  Copy-Item $backup $data -Recurse
  $skip = @("mysql", "performance_schema", "phpmyadmin", "test")
  Get-ChildItem $broken -Directory | Where-Object { $skip -notcontains $_.Name } | ForEach-Object {
    Copy-Item $_.FullName (Join-Path $data $_.Name) -Recurse -Force
  }
  $ibdata = Join-Path $broken "ibdata1"
  if (Test-Path $ibdata) { Copy-Item $ibdata (Join-Path $data "ibdata1") -Force }
  Get-ChildItem $data -Filter "aria_log*" -ErrorAction SilentlyContinue | Remove-Item -Force
  Write-Host ("پوشه خراب به {0} منتقل شد و data از backup بازسازی شد." -f $broken)
  Write-Host "حالا در کنترل‌پنل زمپ روی Start MySQL بزنید، بعد از ریشه پروژه: npm run db:doctor"
}
