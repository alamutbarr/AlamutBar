$ErrorActionPreference='Stop'
$projectRoot=Split-Path -Parent $PSScriptRoot
Set-Location $projectRoot
New-Item -ItemType Directory -Force 'runtime','logs' | Out-Null
if(!(Test-Path 'backend/.venv/Scripts/python.exe')){& python -m venv backend/.venv;if($LASTEXITCODE -ne 0){throw 'Virtual environment setup failed'}}
& backend/.venv/Scripts/python.exe -m pip install -r backend/requirements.lock.txt
if($LASTEXITCODE -ne 0){throw 'Dependency install failed. If files.pythonhosted.org is unavailable, use the documented PyPI mirror command.'}
if(!(Test-Path '.env')){
    $mysqlExe='C:\laragon\bin\mysql\mysql-8.4.3-winx64\bin\mysqld.exe'
    if(!(Test-Path $mysqlExe)){throw 'MySQL 8.4 was not found. Use Docker or set the local executable path.'}
    if(Get-NetTCPConnection -LocalPort 3307 -State Listen -ErrorAction SilentlyContinue){throw 'Port 3307 is occupied. Refusing to initialize an unknown instance.'}
    $dataDir=($projectRoot -replace '\\','/')+'/runtime/mysql'
    if(!(Test-Path 'runtime/mysql/auto.cnf')){& $mysqlExe --no-defaults --initialize-insecure --basedir=C:/laragon/bin/mysql/mysql-8.4.3-winx64 "--datadir=$dataDir" --console;if($LASTEXITCODE -ne 0){throw 'MySQL initialization failed'}}
    $dbProcess=Start-Process -FilePath $mysqlExe -ArgumentList '--no-defaults','--basedir=C:/laragon/bin/mysql/mysql-8.4.3-winx64',"--datadir=$dataDir",'--port=3307','--bind-address=127.0.0.1','--mysqlx=OFF' -WindowStyle Hidden -PassThru
    $dbProcess.Id | Set-Content 'runtime/mysql-process-id.txt'
    for($attempt=0;$attempt -lt 30;$attempt++){if(Get-NetTCPConnection -LocalPort 3307 -State Listen -ErrorAction SilentlyContinue){break};Start-Sleep -Seconds 1}
    & python scripts/configure-local.py
    if($LASTEXITCODE -ne 0){throw 'Database provisioning failed'}
}
& (Join-Path $PSScriptRoot 'start.ps1') -DatabaseOnly
Push-Location backend
try{& .venv/Scripts/python.exe manage.py migrate --noinput;if($LASTEXITCODE -ne 0){throw 'Migration failed'};& .venv/Scripts/python.exe manage.py seed_demo;if($LASTEXITCODE -ne 0){throw 'Demo seeding failed'}}finally{Pop-Location}
& backend/.venv/Scripts/python.exe backend/manage.py seed_content
if($LASTEXITCODE -ne 0){throw 'Content seeding failed'}
& backend/.venv/Scripts/python.exe backend/manage.py seed_local_admin
if($LASTEXITCODE -ne 0){throw 'Local admin seeding failed'}
Push-Location frontend
try{& npm.cmd ci --no-fund --no-audit;if($LASTEXITCODE -ne 0){throw 'Frontend install failed'}}finally{Pop-Location}
& (Join-Path $PSScriptRoot 'build.ps1')
& (Join-Path $PSScriptRoot 'start.ps1')
