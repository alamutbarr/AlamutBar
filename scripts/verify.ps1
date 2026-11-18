$ErrorActionPreference='Stop'
$projectRoot=Split-Path -Parent $PSScriptRoot
function Restart-LocalApiForTests {
    & (Join-Path $PSScriptRoot 'stop.ps1') -BackendOnly
    & (Join-Path $PSScriptRoot 'start.ps1')
    if($LASTEXITCODE -ne 0){throw 'Local service startup failed'}
}
Push-Location (Join-Path $projectRoot 'backend')
try{
    & .venv/Scripts/python.exe -m coverage run --source=logistics manage.py test logistics.tests --keepdb --noinput
    if($LASTEXITCODE -ne 0){throw 'Backend tests failed'}
    & .venv/Scripts/python.exe -m coverage report --omit='logistics/tests/*,logistics/migrations/*,logistics/management/*'
    & .venv/Scripts/python.exe manage.py spectacular --file ../docs/openapi.yaml --validate --fail-on-warn
    if($LASTEXITCODE -ne 0){throw 'OpenAPI validation failed'}
    & .venv/Scripts/python.exe manage.py makemigrations --check --dry-run
    if($LASTEXITCODE -ne 0){throw 'Uncommitted model changes detected'}
}finally{Pop-Location}
Push-Location (Join-Path $projectRoot 'frontend')
try{
    & npm.cmd run typecheck
    if($LASTEXITCODE -ne 0){throw 'TypeScript check failed'}
    Restart-LocalApiForTests
    & npm.cmd run test:e2e
    if($LASTEXITCODE -ne 0){throw 'HTTP journey tests failed'}
    Restart-LocalApiForTests
    & npm.cmd run test:mobile
    if($LASTEXITCODE -ne 0){throw 'Mobile browser tests failed'}
}finally{Pop-Location}
