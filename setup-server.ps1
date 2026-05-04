# setup-server.ps1
# Super Script: Thiet lap CMMS & AI - Ban V3.0 (ASCII Safe)

$ErrorActionPreference = "SilentlyContinue"
Clear-Host

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "[*] DANH SACH PHAN MEM SE CAI DAT:" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "- Git              : Quan ly ma nguon" -ForegroundColor Gray
Write-Host "- Node.js LTS      : Moi truong chay Backend" -ForegroundColor Gray
Write-Host "- Docker Desktop   : Chay Database va Container" -ForegroundColor Gray
Write-Host "- GitHub CLI       : Dieu phoi Task tu Terminal" -ForegroundColor Gray
Write-Host "- Claude Code      : AI Coding Agent (Builder)" -ForegroundColor Gray
Write-Host "- Ollama (Option)  : AI Cuc bo (Dung cho RTX 3060)" -ForegroundColor Gray
Write-Host "" -ForegroundColor Gray
Write-Host "[*] He thong se tu dong kiem tra, neu co roi se bo qua." -ForegroundColor DarkGray
Write-Host "==========================================================" -ForegroundColor Cyan
$confirm = Read-Host "Nhan ENTER de bat dau cai dat hoac Ctrl+C de huy"
Write-Host ""
Write-Host "[>] Dang bat dau..." -ForegroundColor Green

# --- CAI DAT TUAN TU ---

# Git
$cmd = Get-Command git -ErrorAction SilentlyContinue
if ($cmd) { Write-Host "[OK] Git da co san." -ForegroundColor Green }
else { Write-Host "[+] Dang cai Git..." -ForegroundColor Yellow; winget install --id Git.Git --silent --accept-package-agreements --accept-source-agreements }

# Node.js
$cmd = Get-Command node -ErrorAction SilentlyContinue
if ($cmd) { Write-Host "[OK] Node.js da co san." -ForegroundColor Green }
else { Write-Host "[+] Dang cai Node.js..." -ForegroundColor Yellow; winget install --id OpenJS.NodeJS.LTS --silent --accept-package-agreements --accept-source-agreements }

# Docker
$cmd = Get-Command docker -ErrorAction SilentlyContinue
if ($cmd) { Write-Host "[OK] Docker da co san." -ForegroundColor Green }
else { Write-Host "[+] Dang cai Docker Desktop..." -ForegroundColor Yellow; winget install --id Docker.DockerDesktop --silent --accept-package-agreements --accept-source-agreements }

# GitHub CLI
$cmd = Get-Command gh -ErrorAction SilentlyContinue
if ($cmd) { Write-Host "[OK] GitHub CLI da co san." -ForegroundColor Green }
else { Write-Host "[+] Dang cai GitHub CLI..." -ForegroundColor Yellow; winget install --id Microsoft.GitHub.CLI --silent --accept-package-agreements --accept-source-agreements }

# Claude Code
Write-Host "[+] Dang cai Claude Code..." -ForegroundColor Yellow
npm install -g @anthropic-ai/claude-code

# --- LUA CHON OLLAMA ---
Write-Host ""
$olla = Read-Host "Ban co muon cai Ollama (AI cho RTX 3060)? (Y/N)"
if ($olla -eq "Y" -or $olla -eq "y") {
    $cmd = Get-Command ollama -ErrorAction SilentlyContinue
    if ($cmd) { Write-Host "[OK] Ollama da co san." -ForegroundColor Green }
    else { Write-Host "[+] Dang cai Ollama..." -ForegroundColor Yellow; winget install --id Ollama.Ollama --silent --accept-package-agreements --accept-source-agreements }
}

# --- KEO CODE TU GITHUB ---
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
$ProjectDir = "$HOME\Desktop\cmms-webapp"
$dirExists = Test-Path $ProjectDir
if (-not $dirExists) {
    Write-Host "[+] Dang keo code tu GitHub..." -ForegroundColor Yellow
    git clone https://github.com/trucdienhapulico-ai/cmms-webapp.git $ProjectDir
}
Set-Location $ProjectDir
npm install

# --- KET THUC ---
Write-Host ""
Write-Host "==========================================================" -ForegroundColor Green
Write-Host "[OK] MOI TRUONG DA SAN SANG!" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green
Write-Host "Hay thu cac lenh sau:" -ForegroundColor Cyan
Write-Host "  gh auth login          (Dang nhap GitHub)" -ForegroundColor White
Write-Host "  claude auth login      (Dang nhap AI qua trinh duyet)" -ForegroundColor White
Write-Host "  .\claude-worker.ps1    (Chay Builder tu dong)" -ForegroundColor White
Write-Host "==========================================================" -ForegroundColor Green
