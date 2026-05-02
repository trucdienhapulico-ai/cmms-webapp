# sync-to-nas.ps1
# Script ho tro upload code nhanh len Synology NAS

$NAS_USER = "synologybot"
$NAS_HOST = "onecloud"
$NAS_PORT = "2242"
$NAS_DEST = "/volume1/docker/cmms-webapp"

Write-Host "🚀 Dang chuan bi upload code len Synology NAS ($NAS_HOST)..." -ForegroundColor Cyan

# Lay thu muc goc cua dự án (thu muc chua file script nay)
$SourcePath = Get-Item -Path "$PSScriptRoot\..\.."

Write-Host "📂 Nguon: $($SourcePath.FullName)" -ForegroundColor Gray
Write-Host "📂 Dich: $NAS_DEST" -ForegroundColor Gray

# Su dung scp voi tham so port -P (viet hoa)
scp -P $NAS_PORT -r "$($SourcePath.FullName)" "${NAS_USER}@${NAS_HOST}:${NAS_DEST}"

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Upload thanh cong!" -ForegroundColor Green
    Write-Host "👉 Bay gio hay SSH vao NAS va chay lenh docker-compose." -ForegroundColor Yellow
} else {
    Write-Host "❌ Co loi xay ra trong qua trinh upload." -ForegroundColor Red
}
