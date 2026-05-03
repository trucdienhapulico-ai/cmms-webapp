# claude-worker.ps1
# Script tu dong hoa giao viec cho Claude Code voi tinh nang Hang doi (Queue) & Theo doi (Tracking)

$QueueDir = "brain\tasks_queue"
$DoneDir = "brain\tasks_done"
$PollIntervalSeconds = 5

# Tao cac thu muc can thiet
New-Item -ItemType Directory -Force -Path $QueueDir | Out-Null
New-Item -ItemType Directory -Force -Path $DoneDir | Out-Null

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "[*] CLAUDE WORKER (ADVANCED MODE) KICH HOAT!" -ForegroundColor Cyan
Write-Host "-> Thu muc nhan viec (Bo file .txt vao day): $QueueDir" -ForegroundColor Yellow
Write-Host "-> Thu muc luu lich su (Sau khi xong): $DoneDir" -ForegroundColor Green

# PHUC HOI CAC TASK BI TREO LAN TRUOC
$stuckTasks = Get-ChildItem -Path $QueueDir -Filter "*.working"
if ($stuckTasks.Count -gt 0) {
    Write-Host "[!] Phat hien $($stuckTasks.Count) task bi treo (do loi hoac ngat dot ngot lan truoc)." -ForegroundColor Yellow
    foreach ($stuck in $stuckTasks) {
        $recoveredName = $stuck.FullName -replace '\.working$', '.txt'
        Rename-Item $stuck.FullName $recoveredName -Force
        Write-Host "   -> Da khoi phuc lai vao hang doi: $($stuck.BaseName)" -ForegroundColor DarkGray
    }
}
Write-Host "==========================================================" -ForegroundColor Cyan

while ($true) {
    # Quet tat ca file .txt trong hang doi, uu tien file tao truoc (FIFO)
    $tasks = Get-ChildItem -Path $QueueDir -Filter "*.txt" | Sort-Object CreationTime
    
    if ($tasks.Count -gt 0) {
        $task = $tasks[0]
        $taskName = $task.BaseName
        
        Write-Host "`n[>] BAT DAU TASK: $($task.Name) ($(Get-Date -Format 'HH:mm:ss'))" -ForegroundColor Magenta
        $prompt = Get-Content $task.FullName -Raw
        
        # Doi duoi thanh .working de danh dau dang xu ly
        $workingFile = "$QueueDir\$taskName.working"
        Rename-Item $task.FullName "$taskName.working" -Force
        
        Write-Host "[~] Claude Code dang chay... (Vui long khong tat Terminal)" -ForegroundColor DarkCyan
        Write-Host "[i] Meo: Neu thay Claude bi treo (vi du het Token), hay bam Ctrl + C de ngat." -ForegroundColor DarkGray
        
        # Chay Claude
        try {
            claude -p $prompt --dangerously-skip-permissions
            $success = $true
        } catch {
            Write-Host "Loi thuc thi: $_" -ForegroundColor Red
            $success = $false
        }
        
        # Vi nguoi dung dung Ctrl+C co the lam thoat ca script PowerShell, 
        # Neu PowerShell khong thoat va code van chay xuong day, ta xu ly tiep:
        if ($success -and (Test-Path $workingFile)) {
            Write-Host "[OK] DA HOAN TAT: $taskName ($(Get-Date -Format 'HH:mm:ss'))" -ForegroundColor Green
            Move-Item $workingFile "$DoneDir\$taskName.done.txt" -Force
        } 
        elseif (Test-Path $workingFile) {
            Write-Host "[X] LOI HOAC BI HUY: $taskName" -ForegroundColor Red
            Move-Item $workingFile "$DoneDir\$taskName.failed.txt" -Force
        }
        
        Write-Host "==========================================================" -ForegroundColor Cyan
        
        # Nghi 10 giay giua cac task de API "tho"
        Start-Sleep -Seconds 10
    }
    else {
        # Khong co task, chi cho 5s roi lap lai
        Start-Sleep -Seconds $PollIntervalSeconds
    }
}
