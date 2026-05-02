# claude-worker.ps1
# Script tu dong hoa Claude Code (Builder) qua GitHub Issues
# Chay moi 30 phut de tiet kiem token va khong can go lenh thu cong.

$RepoOwner = "trucdienhapulico-ai"
$RepoName = "cmms-webapp"
$PollIntervalSeconds = 180 # 30 phut

Write-Host "🤖 Khoi dong Claude Worker. Tu dong kiem tra Task moi 30 phut..." -ForegroundColor Cyan

while ($true) {
    Write-Host "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] Kiem tra GitHub Issue moi..." -ForegroundColor Yellow
    
    try {
        # Su dung GitHub CLI de lay issue co label 'claude-todo'
        $issuesJson = gh issue list --repo "$RepoOwner/$RepoName" --label "claude-todo" --state open --limit 1 --json number, title, body
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
            claude -p $prompt

            Write-Host "✅ Da hoan tat phien lam viec cua Claude Code cho Issue #$($issue.number)." -ForegroundColor Green
        }
        else {
            Write-Host "⏸ Khong co Task moi. Tiep tuc cho..." -ForegroundColor DarkGray
        }
    }
    catch {
        Write-Host "❌ Loi khi kiem tra GitHub Issue. Hay dam bao ban da cai va dang nhap GitHub CLI (gh auth login)." -ForegroundColor Red
    }

    Write-Host "⏳ Doi 30 phut cho lan kiem tra tiep theo..." -ForegroundColor DarkGray
    Start-Sleep -Seconds $PollIntervalSeconds
}
