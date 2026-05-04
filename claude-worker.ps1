# claude-worker.ps1
# Script tu dong hoa Claude Code - Ban V2.5 (Ultra Reliable Direct Call)
# Chay task ngay ca khi file mo, dung lenh truc tiep de tranh loi Start-Process.

$QueueDir = "brain\tasks_queue"
$DoneDir = "brain\tasks_done"
$ProposalDir = "brain\tasks_proposal"
$PollIntervalSeconds = 5
$MaxQueueSize = 5

# Tao cac thu muc
if (-not (Test-Path $QueueDir)) { New-Item -ItemType Directory -Force -Path $QueueDir | Out-Null }
if (-not (Test-Path $DoneDir)) { New-Item -ItemType Directory -Force -Path $DoneDir | Out-Null }
if (-not (Test-Path $ProposalDir)) { New-Item -ItemType Directory -Force -Path $ProposalDir | Out-Null }

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "[*] CLAUDE WORKER (V2.5 - ULTRA RELIABLE) KICH HOAT!" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# PHUC HOI TASK TREO
Get-ChildItem -Path $QueueDir -Filter "*.working" | ForEach-Object {
    $newName = $_.FullName -replace '\.working$', '.txt'
    Rename-Item $_.FullName $newName -Force -ErrorAction SilentlyContinue
}

while ($true) {
    # 0. QUET DON HANG DOI
    $allTasks = Get-ChildItem -Path $QueueDir -Filter "*.txt" | Sort-Object CreationTime
    if ($allTasks.Count -gt $MaxQueueSize) {
        for ($i = $MaxQueueSize; $i -lt $allTasks.Count; $i++) {
            Move-Item $allTasks[$i].FullName "$ProposalDir\$($allTasks[$i].Name)" -Force -ErrorAction SilentlyContinue
        }
    }

    # 1. KIEM TRA RUN_NOW
    if (Test-Path "RUN_NOW") {
        $content = Get-Content "RUN_NOW" -Raw -ErrorAction SilentlyContinue
        if ($content) {
            $urgentFile = "$QueueDir\URGENT_$(Get-Date -Format 'HHmmss').txt"
            $content | Out-File -FilePath $urgentFile -Encoding utf8
        }
        Remove-Item "RUN_NOW" -Force -ErrorAction SilentlyContinue
    }

    # 2. THUC THI TASK
    $tasks = Get-ChildItem -Path $QueueDir -Filter "*.txt" | Sort-Object CreationTime
    if ($tasks.Count -gt 0) {
        $task = $tasks[0]
        $taskName = $task.BaseName
        $workingFile = "$QueueDir\$taskName.working"
        
        $prompt = Get-Content $task.FullName -Raw -ErrorAction SilentlyContinue
        if (-not $prompt) { Start-Sleep -Seconds 2; continue }

        try {
            Rename-Item $task.FullName $workingFile -Force -ErrorAction Stop
        } catch {
            $prompt | Out-File -FilePath $workingFile -Encoding utf8
            Rename-Item $task.FullName "$($task.FullName).locked" -Force -ErrorAction SilentlyContinue
        }

        Write-Host "`n[>] DANG THUC HIEN: $taskName" -ForegroundColor Magenta
        Write-Host "    -> Dang goi Claude AI... (Vui long cho doi)" -ForegroundColor Cyan
        
        # CHAY TRUC TIEP (Tin cay hon Start-Process tren Windows)
        $exitCode = 0
        try {
            # Luu y: 'claude' o day se goi dung alias/cmd trong shell hien tai
            claude -p $prompt --dangerously-skip-permissions
            $exitCode = $LASTEXITCODE
        } catch {
            Write-Host "[X] LOI NGHIEP TRONG KHI CHAY CLAUDE." -ForegroundColor Red
            $exitCode = 1
        }

        if (Test-Path $workingFile) { 
            $dest = if ($exitCode -eq 0) { "$DoneDir\$taskName.done.txt" } else { "$DoneDir\$taskName.failed.txt" }
            Move-Item $workingFile $dest -Force 
        }
        Remove-Item $task.FullName -Force -ErrorAction SilentlyContinue
        Remove-Item "$($task.FullName).locked" -Force -ErrorAction SilentlyContinue
        
        Write-Host "[!] Hoan tat task voi ExitCode: $exitCode" -ForegroundColor Gray
        Start-Sleep -Seconds 3
        $global:isWaitingPrinted = $false
    } else {
        if (-not $global:isWaitingPrinted) {
            Write-Host "`n[zZz] Dang cho Task moi tai: $QueueDir" -ForegroundColor DarkGray
            $global:isWaitingPrinted = $true
        }
        Start-Sleep -Seconds $PollIntervalSeconds
    }
}
