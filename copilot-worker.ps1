# copilot-worker.ps1
# Script tu dong hoa giao viec cho GitHub Copilot voi tinh nang Hang doi (Queue) & Theo doi (Tracking)
# Chi xu ly cac file bat dau bang header: [TASK INSTRUCTION FOR COPILOT]

$QueueDir = "brain\tasks_queue"
$DoneDir = "brain\tasks_done"
$PollIntervalSeconds = 5

# Tao cac thu muc can thiet
New-Item -ItemType Directory -Force -Path $QueueDir | Out-Null
New-Item -ItemType Directory -Force -Path $DoneDir | Out-Null

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "[*] COPILOT WORKER KICH HOAT!" -ForegroundColor Cyan
Write-Host "-> Thu muc nhan viec (Bo file .txt vao day): $QueueDir" -ForegroundColor Yellow
Write-Host "-> Chi xu ly file co header: [TASK INSTRUCTION FOR COPILOT]" -ForegroundColor Yellow
Write-Host "-> Thu muc luu lich su (Sau khi xong): $DoneDir" -ForegroundColor Green

# PHUC HOI CAC TASK BI TREO LAN TRUOC (chi file copilot)
$stuckTasks = Get-ChildItem -Path $QueueDir -Filter "*.copilot.working" -ErrorAction SilentlyContinue
if ($stuckTasks -and $stuckTasks.Count -gt 0) {
    Write-Host "[!] Phat hien $($stuckTasks.Count) task Copilot bi treo (do loi hoac ngat dot ngot lan truoc)." -ForegroundColor Yellow
    foreach ($stuck in $stuckTasks) {
        $recoveredName = $stuck.FullName -replace '\.copilot\.working$', '.txt'
        Rename-Item $stuck.FullName $recoveredName -Force
        Write-Host "   -> Da khoi phuc lai vao hang doi: $($stuck.BaseName)" -ForegroundColor DarkGray
    }
}
Write-Host "==========================================================" -ForegroundColor Cyan

function Get-CopilotTaskSummary {
    param([string]$Content)
    # Trich xuat dong dau tien co noi dung co nghia (bo qua header va dong trong)
    $lines = $Content -split "`n" | Where-Object { $_.Trim() -ne "" -and $_ -notmatch "^\[TASK INSTRUCTION" }
    if ($lines.Count -gt 0) { return $lines[0].Trim() } else { return "No description" }
}

while ($true) {
    # Quet tat ca file .txt trong hang doi, uu tien file tao truoc (FIFO)
    $allTasks = Get-ChildItem -Path $QueueDir -Filter "*.txt" | Sort-Object CreationTime

    foreach ($task in $allTasks) {
        $content = Get-Content $task.FullName -Raw -ErrorAction SilentlyContinue
        if ($content -match "^\[TASK INSTRUCTION FOR COPILOT\]") {
            $taskName = $task.BaseName

            Write-Host "`n[>] BAT DAU TASK COPILOT: $($task.Name) ($(Get-Date -Format 'HH:mm:ss'))" -ForegroundColor Magenta

            # Doi duoi thanh .copilot.working de danh dau dang xu ly
            $workingFile = "$QueueDir\$taskName.copilot.working"
            Rename-Item $task.FullName "$taskName.copilot.working" -Force

            # Hien thi noi dung task day du
            Write-Host ""
            Write-Host "==================== NOI DUNG TASK ====================" -ForegroundColor White
            Write-Host $content -ForegroundColor Gray
            Write-Host "========================================================" -ForegroundColor White
            Write-Host ""

            # Trich xuat dong tom tat de chay gh copilot suggest
            $summary = Get-CopilotTaskSummary -Content $content

            Write-Host "[~] Dang chay: gh copilot suggest..." -ForegroundColor DarkCyan
            Write-Host "[i] GitHub Copilot khong tu dong — ban se can xem xet va ap dung goi y thu cong." -ForegroundColor DarkGray
            Write-Host ""

            $success = $false
            try {
                # Chay gh copilot suggest voi tom tat task
                gh copilot suggest -t shell $summary
                $success = $true
            } catch {
                Write-Host "[!] Loi khi chay gh copilot suggest: $_" -ForegroundColor Red
                Write-Host "[i] Hay copy noi dung task o tren va paste vao Copilot Chat trong IDE." -ForegroundColor Yellow
                $success = $false
            }

            Write-Host ""
            Write-Host "[?] Ban da ap dung goi y cua Copilot chua?" -ForegroundColor Yellow
            Write-Host "    [1] Hoan tat (done)  |  [2] Bo qua / Loi (skip/failed)" -ForegroundColor Yellow
            $choice = Read-Host "Lua chon (1/2)"

            if ($choice -eq "1") {
                Write-Host "[OK] DA HOAN TAT: $taskName ($(Get-Date -Format 'HH:mm:ss'))" -ForegroundColor Green
                Move-Item $workingFile "$DoneDir\$taskName.done.txt" -Force
            } else {
                Write-Host "[X] BI HUY HOAC LOI: $taskName" -ForegroundColor Red
                Move-Item $workingFile "$DoneDir\$taskName.failed.txt" -Force
            }

            Write-Host "==========================================================" -ForegroundColor Cyan

            # Nghi 5 giay giua cac task
            Start-Sleep -Seconds 5

            break  # Xu ly tung task mot, quay lai vong lap chinh
        }
    }

    # Khong co task Copilot, chi cho roi lap lai
    Start-Sleep -Seconds $PollIntervalSeconds
}
