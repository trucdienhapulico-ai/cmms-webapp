# schedule-worker.ps1
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "⏳ BỘ HẸN GIỜ ĐÁNH THỨC CLAUDE CODE" -ForegroundColor Yellow
Write-Host "=========================================" -ForegroundColor Cyan

$targetTimeStr = "04:21"
$now = Get-Date
$targetTime = Get-Date $targetTimeStr

# Nếu bây giờ đã qua 4:21 sáng, hẹn sang 4:21 sáng hôm sau
if ($now -gt $targetTime) {
    $targetTime = $targetTime.AddDays(1)
}

$sleepSeconds = [Math]::Floor(($targetTime - $now).TotalSeconds)
$sleepHours = [Math]::Floor($sleepSeconds / 3600)
$sleepMins = [Math]::Floor(($sleepSeconds % 3600) / 60)

Write-Host "Hiện tại: $($now.ToString('HH:mm:ss'))"
Write-Host "Mục tiêu: $($targetTime.ToString('HH:mm:ss'))"
Write-Host "Claude Code đang ngủ đông... Sẽ tự động thức dậy sau $sleepHours giờ $sleepMins phút." -ForegroundColor DarkGray

Start-Sleep -Seconds $sleepSeconds

Write-Host "`n⏰ ĐÃ ĐẾN GIỜ! Khởi động Claude Worker..." -ForegroundColor Green
.\claude-worker.ps1
