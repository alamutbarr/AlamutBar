param([switch]$Dev,[switch]$DatabaseOnly)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$runtimePath = Join-Path $projectRoot 'runtime'
$logsPath = Join-Path $projectRoot 'logs'
New-Item -ItemType Directory -Force -Path $runtimePath,$logsPath | Out-Null
if (!(Test-Path -LiteralPath (Join-Path $projectRoot '.env'))) { throw 'Run scripts/bootstrap.ps1 first.' }
$mysqlExe = 'C:\laragon\bin\mysql\mysql-8.4.3-winx64\bin\mysqld.exe'
$dbPort = Get-NetTCPConnection -LocalPort 3307 -State Listen -ErrorAction SilentlyContinue
if (!$dbPort) {
    if (!(Test-Path -LiteralPath $mysqlExe)) { throw 'Set the MySQL executable path in scripts/start.ps1 or use Docker Compose.' }
    $dataDir = ($projectRoot -replace '\\','/') + '/runtime/mysql'
    $dbProcess = Start-Process -FilePath $mysqlExe -ArgumentList '--no-defaults','--basedir=C:/laragon/bin/mysql/mysql-8.4.3-winx64',"--datadir=$dataDir",'--port=3307','--bind-address=127.0.0.1','--mysqlx=OFF',"--log-error=$($logsPath -replace '\\','/')/mysql.log" -WindowStyle Hidden -PassThru
    $dbProcess.Id | Set-Content (Join-Path $runtimePath 'mysql-process-id.txt')
    for ($attempt=0;$attempt -lt 30;$attempt++) { if(Get-NetTCPConnection -LocalPort 3307 -State Listen -ErrorAction SilentlyContinue){break};Start-Sleep -Seconds 1 }
}
if($DatabaseOnly){return}
. (Join-Path $PSScriptRoot 'public-settings.ps1')
$localOrigins=@($env:SITE_URL,$env:DRIVER_URL,$env:OWNER_URL,$env:INSPECTOR_URL,$env:ADMIN_URL)
$env:DJANGO_ALLOWED_HOSTS=(@('localhost','127.0.0.1','backend','testserver') + ($localOrigins | ForEach-Object {([uri]$_).Host}) | Select-Object -Unique) -join ','
$env:CSRF_TRUSTED_ORIGINS=$localOrigins -join ','
function Start-AlamutService($name,$port,$file,$arguments,$workdir) {
    $existing = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
    if($existing){Write-Host "$name already has a listener on port $port; preserved.";return}
    $serviceProcess=Start-Process -FilePath $file -ArgumentList $arguments -WorkingDirectory $workdir -WindowStyle Hidden -RedirectStandardOutput (Join-Path $logsPath "$name.stdout.log") -RedirectStandardError (Join-Path $logsPath "$name.stderr.log") -PassThru
    $serviceProcess.Id | Set-Content (Join-Path $runtimePath "$name-process-id.txt")
}
$backendPath=Join-Path $projectRoot 'backend'
$frontendPath=Join-Path $projectRoot 'frontend'
$sitePath=Join-Path $frontendPath 'apps\site'
Start-AlamutService 'backend' 8001 (Join-Path $backendPath '.venv\Scripts\python.exe') @('-u', (Join-Path $backendPath 'manage.py'), 'runserver','127.0.0.1:8001','--noreload') $backendPath
if($Dev){
    & node.exe (Join-Path $frontendPath 'scripts\prepare-site-assets.mjs')
    if($LASTEXITCODE -ne 0){throw 'Preparing local site assets failed.'}
    Start-AlamutService 'web' 3001 'node.exe' @((Join-Path $frontendPath 'node_modules\next\dist\bin\next'),'dev','--hostname','127.0.0.1','--port','3001') $sitePath
}else{
    $standalone=Join-Path $sitePath '.next\standalone\apps\site'
    if(!(Test-Path -LiteralPath (Join-Path $standalone 'server.js'))){throw 'Build missing. Run scripts/build.ps1 first.'}
    $env:HOSTNAME='127.0.0.1';$env:PORT='3001';$env:NODE_ENV='production';$env:NEXT_TELEMETRY_DISABLED='1'
    Start-AlamutService 'web' 3001 'node.exe' @((Join-Path $standalone 'server.js')) $standalone
}
foreach($panel in @(@('driver',3002),@('owner',3003),@('inspector',3004))){
    $panelPath=Join-Path $frontendPath "apps/$($panel[0])"
    $panelArgs=if($Dev){@((Join-Path $frontendPath 'node_modules/vite/bin/vite.js'),'--host','127.0.0.1')}else{@((Join-Path $frontendPath 'node_modules/vite/bin/vite.js'),'preview','--host','127.0.0.1')}
    if(!$Dev -and !(Test-Path -LiteralPath (Join-Path $panelPath 'dist/index.html'))){throw 'Panel build missing. Run scripts/build.ps1 first.'}
    Start-AlamutService $panel[0] $panel[1] 'node.exe' $panelArgs $panelPath
}
function Start-AlamutJob($name,$arguments){
    $record=Join-Path $runtimePath "$name-process-id.txt"
    if(Test-Path -LiteralPath $record){$savedId=[int](Get-Content -LiteralPath $record);$existingJob=Get-CimInstance Win32_Process -Filter "ProcessId=$savedId" -ErrorAction SilentlyContinue;if($existingJob -and $existingJob.CommandLine -like "*$projectRoot*"){return}}
    $jobProcess=Start-Process -FilePath (Join-Path $backendPath '.venv/Scripts/python.exe') -ArgumentList $arguments -WorkingDirectory $backendPath -WindowStyle Hidden -RedirectStandardOutput (Join-Path $logsPath "$name.stdout.log") -RedirectStandardError (Join-Path $logsPath "$name.stderr.log") -PassThru
    $jobProcess.Id | Set-Content -LiteralPath $record
}
Start-AlamutJob 'mail' @('-u',(Join-Path $backendPath 'manage.py'),'deliver_outbox','--loop')
if(Test-Path -LiteralPath (Join-Path $runtimePath 'mysql-client.cnf')){Start-AlamutJob 'backup' @('-u',(Join-Path $projectRoot 'scripts/backup.py'),'--loop','--verify')}
for($attempt=0;$attempt -lt 30;$attempt++) {
    try {
        $health=Invoke-RestMethod "$($env:SITE_URL)/api/health/" -TimeoutSec 2
        $panelReady=$true
        foreach($panelOrigin in @($env:DRIVER_URL,$env:OWNER_URL,$env:INSPECTOR_URL)){
            $panelUri=[uri]$panelOrigin
            $panelHealth=Invoke-RestMethod "http://127.0.0.1:$($panelUri.Port)/api/health/" -Headers @{Host=$panelUri.Authority} -TimeoutSec 2
            if($panelHealth.service -ne 'alamut-api'){$panelReady=$false}
        }
        $adminUri=[uri]$env:ADMIN_URL
        $admin=Invoke-WebRequest "http://127.0.0.1:$($adminUri.Port)/django-admin/login/" -Headers @{Host=$adminUri.Authority} -TimeoutSec 2
        if($health.service -eq 'alamut-api' -and $panelReady -and $admin.StatusCode -eq 200){Write-Host "Alamut running: $env:SITE_URL | $env:DRIVER_URL | $env:OWNER_URL | $env:INSPECTOR_URL | $env:ADMIN_URL/django-admin/";exit 0}
    }catch{}
    Start-Sleep -Seconds 1
}
throw 'Startup verification failed. See logs/.'
