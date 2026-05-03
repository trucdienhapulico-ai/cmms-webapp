# sync-to-nas.ps1
# Script ho tro upload code nhanh len Synology NAS (Sua loi ma hoa)

$NAS_USER = "synologybot"
$NAS_HOST = "onecloud"
$NAS_PORT = "2242"
$NAS_DEST = "/volume1/docker/cmms-webapp"

Write-Host "--- Uploading to Synology NAS ($NAS_HOST) ---" -ForegroundColor Cyan

$SourcePath = Get-Item -Path "$PSScriptRoot\..\.."
Write-Host "Source: $($SourcePath.FullName)" -ForegroundColor Gray
Write-Host "Dest: $NAS_DEST" -ForegroundColor Gray

# Luu y: Lenh nay van co the hoi mat khau neu chua setup SSH Key
scp -P $NAS_PORT -r "$($SourcePath.FullName)" "${NAS_USER}@${NAS_HOST}:${NAS_DEST}"

if ($LASTEXITCODE -eq 0) {
    Write-Host "SUCCESS: Upload complete!" -ForegroundColor Green
} else {
    Write-Host "ERROR: Upload failed." -ForegroundColor Red
}
