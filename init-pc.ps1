# init-pc.ps1
# Super Script: Thiet lap CMMS & AI tu con so 0 (Windows)
# Yeu cau: Chay voi quyen Administrator

$ErrorActionPreference = "SilentlyContinue"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "🚀 BAT DAU THIET LAP HE THONG CMMS & AI TU DONG" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. KIEM TRA VA CAI DAT PHAN MEM NEN TANG QUA WINGET
function Install-App($Name, $Id) {
    if (Get-Command $Name -ErrorAction SilentlyContinue) {
        Write-Host "[✓] $Name da co san." -ForegroundColor Green
    } else {
        Write-Host "[+] Dang cai dat $Name..." -ForegroundColor Yellow
        winget install --id $Id --silent --accept-package-agreements --accept-source-agreements
    }
}

Install-App "git" "Git.Git"
Install-App "node" "OpenJS.NodeJS.LTS"
Install-App "docker" "Docker.DockerDesktop"
Install-App "ollama" "Ollama.Ollama"

# 2. CAP NHAT PATH (De nhan lenh vua cai)
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")

# 3. KEO CODE TU GITHUB (Neu chua co)
$ProjectDir = "$HOME\Desktop\cmms-webapp"
if (-not (Test-Path $ProjectDir)) {
    Write-Host "[+] Dang keo code tu GitHub..." -ForegroundColor Yellow
    git clone https://github.com/trucdienhapulico-ai/cmms-webapp.git $ProjectDir
}
Set-Location $ProjectDir

# 4. CAI DAT THU VIEN NPM
Write-Host "[+] Dang cai dat thu vien (npm install)..." -ForegroundColor Yellow
npm install
npm install -g @anthropic-ai/claude-code

# 5. KHOI TAO FILE CAU HINH
if (-not (Test-Path "env")) { New-Item -ItemType Directory -Path "env" | Out-Null }
if (-not (Test-Path "env\stable.env")) { Copy-Item "env\stable.env.template" "env\stable.env" -ErrorAction SilentlyContinue }
if (-not (Test-Path "data\db.json")) { Copy-Item "data\db.json.template" "data\db.json" -ErrorAction SilentlyContinue }

Write-Host "`n==========================================================" -ForegroundColor Green
Write-Host "✅ HOAN TAT CAI DAT PHAN CUNG & MOI TRUONG!" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green
Write-Host "👉 BUOC TIEP THEO (BAN CAN LAM THU CONG):" -ForegroundColor Cyan
Write-Host "1. Chay Docker Desktop tu Start Menu." -ForegroundColor Yellow
Write-Host "2. Dang nhap GitHub: gh auth login" -ForegroundColor Yellow
Write-Host "3. Dang nhap Claude: claude auth login" -ForegroundColor Yellow
Write-Host "4. Chay Worker: .\claude-worker.ps1" -ForegroundColor Yellow
Write-Host "==========================================================" -ForegroundColor Green
