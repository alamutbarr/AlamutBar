$ErrorActionPreference='Stop'
$projectRoot=Split-Path -Parent $PSScriptRoot
. (Join-Path $PSScriptRoot 'public-settings.ps1')
$existingWeb=Get-NetTCPConnection -LocalPort 3001 -State Listen -ErrorAction SilentlyContinue
$restoreServices=$false
if($existingWeb){
    $webInfo=Get-CimInstance Win32_Process -Filter "ProcessId=$($existingWeb.OwningProcess)"
    if($webInfo.CommandLine -like "*$projectRoot*"){
        $restoreServices=$true
        & (Join-Path $PSScriptRoot 'stop.ps1') -WebOnly
    }else{throw 'Port 3001 belongs to another project; it was preserved.'}
}
Push-Location (Join-Path $projectRoot 'frontend')
try {
    & npm.cmd run typecheck
    if($LASTEXITCODE -ne 0){throw 'TypeScript check failed'}
    & npm.cmd run build
    if($LASTEXITCODE -ne 0){throw 'Next.js build failed'}
    & npm.cmd run build:apps
    if($LASTEXITCODE -ne 0){throw 'React application build failed'}
}finally{Pop-Location}
if($restoreServices){& (Join-Path $PSScriptRoot 'start.ps1')}
