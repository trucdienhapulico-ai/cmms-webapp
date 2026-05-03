# claude-worker.ps1
# Script tu dong hoa Claude Code (Builder) qua GitHub Issues
# Chay moi 30 phut de tiet kiem token va khong can go lenh thu cong.

$RepoOwner = "trucdienhapulico-ai"
$RepoName = "cmms-webapp"
$PollIntervalSeconds = 900 # 15 phut
$TriggerFile = "RUN_NOW"

Write-Host "🤖 Khoi dong Claude Worker. Quet task moi 15 phut hoặc khi co file '$TriggerFile'..." -ForegroundColor Cyan

while ($true) {
    Write-Host "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] Kiem tra GitHub Issue moi..." -ForegroundColor Yellow
    
    try {
        # Su dung GitHub CLI de lay issue co label 'claude-todo'
        $issuesJson = gh issue list --repo "$RepoOwner/$RepoName" --label "claude-todo" --state open --limit 1 --json "number,title,body"
        $issues = $issuesJson | ConvertFrom-Json

        if ($issues.Count -gt 0) {
            $issue = $issues[0]
            Write-Host "✅ Tim thay Task moi: #$($issue.number) - $($issue.title)" -ForegroundColor Green
            Write-Host "🚀 Dang khoi chay Claude Code de xu ly..." -ForegroundColor Cyan

            # Xay dung prompt sieu ngan de toi uu token cho Builder
            # Builder khong can doc lai toan bo doc, chi doc dung Issue nay.
            $prompt = @"
Ban la Builder. Hay thuc hien ngay Task sau tu GitHub Issue #$($issue.number):
Ten: $($issue.title)
Mo ta: $($issue.body)

Hay sua code tuong ung. Sau khi hoan thanh, hay commit, push va dong issue #$($issue.number) nay.
Khong tu y phan tich cac file khong lien quan de tiet kiem token.
"@

            # Chay claude voi prompt truc tiep
            # Tuy theo version cua claude-code, co thuong la -p hoac chay truc tiep
            claude -p $prompt --dangerously-skip-permissions | Tee-Object -FilePath "claude-activity.log" -Append

            Write-Host "✅ Da hoan tat phien lam viec cua Claude Code cho Issue #$($issue.number)." -ForegroundColor Green
        }
        else {
            Write-Host "⏸ Khong co Task moi. Tiep tuc cho..." -ForegroundColor DarkGray
        }
    }
    catch {
        Write-Host "❌ Loi khi kiem tra GitHub Issue. Hay dam bao ban da cai va dang nhap GitHub CLI (gh auth login)." -ForegroundColor Red
    }

    Write-Host "⏳ Doi 15 phut cho lan tiep theo (Hoac tao file '$TriggerFile' de chay ngay)..." -ForegroundColor DarkGray
    
    # Vong lap cho thong minh: Kiem tra file trigger moi 5 giay
    $waited = 0
    while ($waited -lt $PollIntervalSeconds) {
        if (Test-Path $TriggerFile) {
            Remove-Item $TriggerFile
            Write-Host "🚀 Nhan duoc lenh CHAY NGAY!" -ForegroundColor Magenta
            break
        }
        Start-Sleep -Seconds 5
        $waited += 5
    }
}
