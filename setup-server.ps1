# setup-server.ps1 V3.2
$ErrorActionPreference = "SilentlyContinue"
Clear-Host
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "[*] DANH SACH PHAN MEM SE CAI DAT:" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "- Git              : Quan ly ma nguon" -ForegroundColor Gray
Write-Host "- Node.js LTS      : Moi truong chay Backend" -ForegroundColor Gray
Write-Host "- Docker Desktop   : Chay Database va Container" -ForegroundColor Gray
Write-Host "- GitHub CLI       : Dieu phoi Task tu Terminal" -ForegroundColor Gray
Write-Host "- Claude Code      : AI Coding Agent" -ForegroundColor Gray
Write-Host "==========================================================" -ForegroundColor Cyan
$null = Read-Host "Nhan ENTER de bat dau hoac Ctrl+C de huy"
Write-Host "[>] Dang bat dau..." -ForegroundColor Green
$cmd = Get-Command git -ErrorAction SilentlyContinue; if ($cmd) { Write-Host "[OK] Git da co." -ForegroundColor Green } else { winget install --id Git.Git --silent --accept-package-agreements --accept-source-agreements }
$cmd = Get-Command node -ErrorAction SilentlyContinue; if ($cmd) { Write-Host "[OK] Node.js da co." -ForegroundColor Green } else { winget install --id OpenJS.NodeJS.LTS --silent --accept-package-agreements --accept-source-agreements }
$cmd = Get-Command docker -ErrorAction SilentlyContinue; if ($cmd) { Write-Host "[OK] Docker da co." -ForegroundColor Green } else { winget install --id Docker.DockerDesktop --silent --accept-package-agreements --accept-source-agreements }
$cmd = Get-Command gh -ErrorAction SilentlyContinue; if ($cmd) { Write-Host "[OK] GitHub CLI da co." -ForegroundColor Green } else { winget install --id Microsoft.GitHub.CLI --silent --accept-package-agreements --accept-source-agreements }
Write-Host "[+] Dang cai Claude Code..." -ForegroundColor Yellow; npm install -g @anthropic-ai/claude-code
$env:Path = [System.Environment]::GetEnvironmentVariable('Path','Machine') + ';' + [System.Environment]::GetEnvironmentVariable('Path','User')
$d = Join-Path $HOME 'Desktop\cmms-webapp'
if (-not (Test-Path $d)) { Write-Host "[+] Dang keo code..." -ForegroundColor Yellow; git clone https://github.com/trucdienhapulico-ai/cmms-webapp.git $d }
Set-Location $d; npm install
Write-Host "==========================================================" -ForegroundColor Green
Write-Host "[OK] MOI TRUONG DA SAN SANG!" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green
Write-Host "  gh auth login          (Dang nhap GitHub)" -ForegroundColor White
Write-Host "  claude auth login      (Dang nhap AI)" -ForegroundColor White
Write-Host "  .\claude-worker.ps1    (Chay Builder)" -ForegroundColor White
Write-Host "==========================================================" -ForegroundColor Green
