# claude-worker.ps1
# Script tu dong hoa giao viec cho Claude Code voi tinh nang Hang doi (Queue) & RUN_NOW
# Cap nhat: Them co che Timeout de chong vong lap vo tan.

$QueueDir = "brain\tasks_queue"
$DoneDir = "brain\tasks_done"
$ProposalDir = "brain\tasks_proposal"
$PollIntervalSeconds = 5
$MaxExecutionTimeSeconds = 900 # 15 phut gioi han cho moi task
$MaxQueueSize = 5 # Toi da 5 task cho trong hang doi

# Tao cac thu muc can thiet
New-Item -ItemType Directory -Force -Path $QueueDir | Out-Null
New-Item -ItemType Directory -Force -Path $DoneDir | Out-Null
New-Item -ItemType Directory -Force -Path $ProposalDir | Out-Null

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "[*] CLAUDE WORKER (V2 - SAFE MODE) KICH HOAT!" -ForegroundColor Cyan
Write-Host "-> Thu muc hang doi: $QueueDir" -ForegroundColor Yellow
Write-Host "-> Gioi han thoi gian: $($MaxExecutionTimeSeconds/60) phut/task" -ForegroundColor Red
Write-Host "==========================================================" -ForegroundColor Cyan

# PHUC HOI CAC TASK BI TREO LAN TRUOC
$stuckTasks = Get-ChildItem -Path $QueueDir -Filter "*.working"
if ($stuckTasks.Count -gt 0) {
    Write-Host "[!] Khoi phuc $($stuckTasks.Count) task bi treo..." -ForegroundColor Yellow
    foreach ($stuck in $stuckTasks) {
        $recoveredName = $stuck.FullName -replace '\.working$', '.txt'
        Rename-Item $stuck.FullName $recoveredName -Force
    }
}

while ($true) {
    # 0. QUET DON HANG DOI (CHONG SPAM)
    $allTasks = Get-ChildItem -Path $QueueDir -Filter "*.txt" | Sort-Object CreationTime
    if ($allTasks.Count -gt $MaxQueueSize) {
        Write-Host "[!] Canh bao: Hang doi vuot gioi han ($($allTasks.Count)/$MaxQueueSize). Dang chuyen cac task moi vao thu muc Proposal..." -ForegroundColor Yellow
        for ($i = $MaxQueueSize; $i -lt $allTasks.Count; $i++) {
            $excessTask = $allTasks[$i]
            Move-Item $excessTask.FullName "$ProposalDir\$($excessTask.Name)" -Force
        }
    }

    # 1. KIEM TRA FILE RUN_NOW O THU MUC GOC
    if (Test-Path "RUN_NOW") {
        $content = Get-Content "RUN_NOW" -Raw
        if ($content -and $content.Trim().Length -gt 0) {
            $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
            $urgentFile = "$QueueDir\URGENT_$($timestamp).txt"
            $content | Out-File -FilePath $urgentFile -Encoding utf8
            Write-Host "[!] Phat hien RUN_NOW: Da chuyen thanh Task URGENT." -ForegroundColor Green
        } else {
            Write-Host "[!] Phat hien RUN_NOW (Trong): Kich hoat quet hang doi ngay." -ForegroundColor Cyan
        }
        Remove-Item "RUN_NOW" -Force
    }

    # 2. QUET HANG DOI
    $tasks = Get-ChildItem -Path $QueueDir -Filter "*.txt" | Sort-Object CreationTime
    
    if ($tasks.Count -gt 0) {
        $task = $tasks[0]
        $taskName = $task.BaseName
        $prompt = Get-Content $task.FullName -Raw
        $workingFile = "$QueueDir\$taskName.working"
        
        Rename-Item $task.FullName "$taskName.working" -Force
        Write-Host "`n[>] THUC THI: $taskName ($(Get-Date -Format 'HH:mm:ss'))" -ForegroundColor Magenta
        
        # CHAY CLAUDE VOI CO CHE TIMEOUT
        $startTime = Get-Date
        $process = Start-Process claude -ArgumentList "-p `"$prompt`"", "--dangerously-skip-permissions" -NoNewWindow -PassThru -ErrorAction SilentlyContinue

        if ($process) {
            $isTimeout = $false
            while (-not $process.HasExited) {
                if ((Get-Date) -gt $startTime.AddSeconds($MaxExecutionTimeSeconds)) {
                    $isTimeout = $true
                    Write-Host "[!!!] CANH BAO: Task vuot qua thoi gian cho phep ($($MaxExecutionTimeSeconds)s). Dang ngat..." -ForegroundColor Red
                    Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue
                    break
                }
                Start-Sleep -Seconds 2
            }

            if ($isTimeout) {
                if (Test-Path $workingFile) { Move-Item $workingFile "$DoneDir\$taskName.timeout.txt" -Force }
            } elseif ($process.ExitCode -eq 0) {
                Write-Host "[OK] THANH CONG." -ForegroundColor Green
                if (Test-Path $workingFile) { Move-Item $workingFile "$DoneDir\$taskName.done.txt" -Force }
            } else {
                Write-Host "[X] THAT BAI (ExitCode: $($process.ExitCode))." -ForegroundColor Red
                if (Test-Path $workingFile) { Move-Item $workingFile "$DoneDir\$taskName.failed.txt" -Force }
            }
        } else {
            Write-Host "[X] Khong the khoi chay Claude." -ForegroundColor Red
            if (Test-Path $workingFile) { Rename-Item $workingFile "$taskName.txt" -Force }
        }
        
        Write-Host "==========================================================" -ForegroundColor Cyan
        Start-Sleep -Seconds 5
    }
    else {
        Start-Sleep -Seconds $PollIntervalSeconds
    }
}
