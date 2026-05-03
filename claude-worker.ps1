# claude-worker.ps1
# Script tu dong hoa Claude Code (Builder) qua GitHub Issues
# Chay moi 30 phut de tiet kiem token va khong can go lenh thu cong.

$RepoOwner = "trucdienhapulico-ai"
$RepoName = "cmms-webapp"
$PollIntervalSeconds = 900 # 15 phut
$TriggerFile = "RUN_NOW"

Write-Host "🤖 Khoi dong Claude Worker. Quet task moi 15 phut hoặc khi co file '$TriggerFile'..." -ForegroundColor Cyan

while ($true) {
    if (Test-Path $TriggerFile) {
        Write-Host "🚀 Nhan duoc lenh CHAY NGAY tu file $TriggerFile!" -ForegroundColor Magenta
        $prompt = Get-Content $TriggerFile -Raw
        Write-Host "Dang khoi chay Claude Code..." -ForegroundColor Cyan
        
        # Chay claude voi prompt lay tu file RUN_NOW
        claude -p $prompt --dangerously-skip-permissions | Tee-Object -FilePath "claude-activity.log" -Append
        
        Write-Host "✅ Da hoan tat phien lam viec. Dang xoa file $TriggerFile..." -ForegroundColor Green
        Remove-Item $TriggerFile -Force
    }
    else {
        # Ban co the them logic quet GitHub Issue o day neu muon, hoac chi dung RUN_NOW
        Write-Host "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] ⏸ Khong co file RUN_NOW. Tiep tuc cho..." -ForegroundColor DarkGray
    }

    Write-Host "⏳ Doi 15 phut cho lan tiep theo (Hoac tao file '$TriggerFile' de chay ngay)..." -ForegroundColor DarkGray
    
    # Vong lap cho thong minh: Kiem tra file trigger moi 5 giay
    $waited = 0
    while ($waited -lt $PollIntervalSeconds) {
        if (Test-Path $TriggerFile) {
            # Bẻ gãy vòng lặp chờ để lên đầu chạy ngay
            break
        }
        Start-Sleep -Seconds 5
        $waited += 5
    }
}
