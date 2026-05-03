# claude-worker.ps1
# Script tu dong hoa Claude Code (Builder)
# Chay moi 30 phut de tiet kiem token va khong can go lenh thu cong.

$PollIntervalSeconds = 1800 # 30 phut
$TriggerFile = "RUN_NOW"

Write-Host "🤖 Khoi dong Claude Worker. Quet task moi 30 phut hoac ngay khi co file '$TriggerFile'..." -ForegroundColor Cyan

while ($true) {
    if (Test-Path $TriggerFile) {
        Write-Host "🚀 Nhan duoc lenh CHAY NGAY tu file $TriggerFile!" -ForegroundColor Magenta
        $prompt = Get-Content $TriggerFile -Raw
        Write-Host "Dang khoi chay Claude Code..." -ForegroundColor Cyan
        
        # Đổi tên file để hiển thị trực quan là Claude đang làm việc
        Rename-Item $TriggerFile "CLAUDE_IS_WORKING.txt" -Force
        
        # Chay claude voi prompt lay tu file, bỏ Tee-Object để UI của Claude hiện đầy đủ trên Terminal
        claude -p $prompt --dangerously-skip-permissions
        
        Write-Host "✅ Da hoan tat phien lam viec. Dang don dep..." -ForegroundColor Green
        Remove-Item "CLAUDE_IS_WORKING.txt" -Force
    }
    else {
        Write-Host "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] ⏸ Khong co file RUN_NOW. Tiep tuc cho..." -ForegroundColor DarkGray
    }

    Write-Host "⏳ Doi 30 phut cho lan tiep theo (Hoac tao/sua file '$TriggerFile' de chay ngay)..." -ForegroundColor DarkGray
    
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
