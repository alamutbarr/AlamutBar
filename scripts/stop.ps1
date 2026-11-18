param([switch]$Database,[switch]$WebOnly,[switch]$BackendOnly)
$ErrorActionPreference='Stop'
$projectRoot=Split-Path -Parent $PSScriptRoot
$normalizedProjectRoot=$projectRoot -replace '\\','/'
$services=if($WebOnly){@('web','driver','owner','inspector')}elseif($BackendOnly){@('backend')}else{@('web','driver','owner','inspector','backend','mail','backup')}
if($Database){
    $clientConfig=Join-Path $projectRoot 'runtime/mysql-client.cnf'
    if(Test-Path -LiteralPath $clientConfig){
        & 'C:\laragon\bin\mysql\mysql-8.4.3-winx64\bin\mysqladmin.exe' "--defaults-extra-file=$clientConfig" shutdown
        if($LASTEXITCODE -ne 0){throw 'MySQL graceful shutdown failed'}
        Write-Host 'Project MySQL instance stopped.'
    }
}
foreach($service in $services){
    $pidPath=Join-Path $projectRoot "runtime/$service-process-id.txt"
    if(!(Test-Path -LiteralPath $pidPath)){continue}
    $serviceId=[int](Get-Content -LiteralPath $pidPath)
    $processInfo=Get-CimInstance Win32_Process -Filter "ProcessId=$serviceId" -ErrorAction SilentlyContinue
    if(!$processInfo){continue}
    if($processInfo.CommandLine -notlike "*$projectRoot*" -and $processInfo.CommandLine -notlike "*$normalizedProjectRoot*"){throw "Refusing to stop unrelated process $serviceId"}
    $children=Get-CimInstance Win32_Process -Filter "ParentProcessId=$serviceId"
    foreach($child in $children){if($child.CommandLine -like "*$projectRoot*"){Stop-Process -Id $child.ProcessId -ErrorAction SilentlyContinue}}
    Stop-Process -Id $serviceId -ErrorAction SilentlyContinue
    Write-Host "$service stopped."
}
