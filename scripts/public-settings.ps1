# Only public values enter frontend processes. Django reads its own private .env.
$publicSettingsRoot = Split-Path -Parent $PSScriptRoot
$settingsFile = Join-Path $publicSettingsRoot '.env'
if(Test-Path -LiteralPath $settingsFile){
    foreach($settingLine in Get-Content -LiteralPath $settingsFile){
        if($settingLine -match '^(SITE_URL|DRIVER_URL|OWNER_URL|INSPECTOR_URL|ADMIN_URL|GOOGLE_SITE_VERIFICATION|API_INTERNAL_URL|BUSINESS_OPERATOR_NAME|BUSINESS_CONTACT_EMAIL|BUSINESS_RETENTION_NOTICE|BUSINESS_TERMS_NOTICE)=(.*)$'){
            $settingName=$Matches[1];$settingValue=$Matches[2].Trim().Trim('"').Trim("'")
            if(-not [Environment]::GetEnvironmentVariable($settingName,'Process')){[Environment]::SetEnvironmentVariable($settingName,$settingValue,'Process')}
        }
    }
}
$env:MULTI_APP='1'
$env:APP_URL=''
$publicDefaults=@{SITE_URL='http://127.0.0.1:3001';DRIVER_URL='http://driver.localhost:3002';OWNER_URL='http://owner.localhost:3003';INSPECTOR_URL='http://inspector.localhost:3004';ADMIN_URL='http://admin.localhost:8001'}
foreach($settingName in $publicDefaults.Keys){if(-not [Environment]::GetEnvironmentVariable($settingName,'Process')){[Environment]::SetEnvironmentVariable($settingName,$publicDefaults[$settingName],'Process')}}
