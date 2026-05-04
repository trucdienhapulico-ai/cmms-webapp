# setup-copilot.ps1
# Script cai dat va xac thuc GitHub Copilot CLI extension

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "[*] CAI DAT GITHUB COPILOT CLI" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# Kiem tra gh CLI da duoc cai dat chua
Write-Host "`n[1] Kiem tra GitHub CLI (gh)..." -ForegroundColor Yellow
try {
    $ghVersion = gh --version 2>&1 | Select-Object -First 1
    Write-Host "    [OK] $ghVersion" -ForegroundColor Green
} catch {
    Write-Host "    [X] GitHub CLI chua duoc cai dat!" -ForegroundColor Red
    Write-Host "    -> Tai ve tai: https://cli.github.com/" -ForegroundColor DarkGray
    exit 1
}

# Kiem tra trang thai xac thuc
Write-Host "`n[2] Kiem tra xac thuc GitHub..." -ForegroundColor Yellow
$authStatus = gh auth status 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "    [OK] Da dang nhap GitHub." -ForegroundColor Green
    Write-Host $authStatus -ForegroundColor DarkGray
} else {
    Write-Host "    [!] Chua dang nhap. Dang chay gh auth login..." -ForegroundColor Yellow
    gh auth login
}

# Cai dat extension gh copilot
Write-Host "`n[3] Cai dat extension github/gh-copilot..." -ForegroundColor Yellow
$extList = gh extension list 2>&1
if ($extList -match "gh-copilot") {
    Write-Host "    [OK] Extension gh-copilot da duoc cai dat." -ForegroundColor Green
} else {
    Write-Host "    -> Dang cai dat..." -ForegroundColor DarkCyan
    gh extension install github/gh-copilot
    if ($LASTEXITCODE -eq 0) {
        Write-Host "    [OK] Cai dat thanh cong!" -ForegroundColor Green
    } else {
        Write-Host "    [X] Cai dat that bai. Kiem tra lai quyen truy cap GitHub." -ForegroundColor Red
        exit 1
    }
}

# Kiem tra lan cuoi
Write-Host "`n[4] Xac nhan gh copilot hoat dong..." -ForegroundColor Yellow
gh copilot --version 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "    [OK] gh copilot san sang su dung!" -ForegroundColor Green
} else {
    Write-Host "    [!] Co van de. Chay 'gh copilot --help' de kiem tra." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "[*] SETUP HOAN TAT!" -ForegroundColor Green
Write-Host "    Chay '.\copilot-worker.ps1' de bat dau lang nghe task." -ForegroundColor Yellow
Write-Host "==========================================================" -ForegroundColor Cyan
