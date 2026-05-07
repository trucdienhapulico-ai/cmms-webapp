# Hướng dẫn Thiết lập Máy chủ CMMS & AI (Duy nhất 1 lệnh)

Tài liệu này cung cấp phương thức cài đặt tự động toàn bộ môi trường CMMS trên máy tính Windows Core i7 / RTX 3060.

---

## 🚀 Cách 1: Cài đặt tự động (Khuyên dùng)

Bạn chỉ cần mở **PowerShell với quyền Administrator**, sao chép và dán lệnh sau:

```powershell
Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.SecurityProtocolType]::Tls12; $script = (New-Object System.Net.WebClient).DownloadString('https://raw.githubusercontent.com/trucdienhapulico-ai/cmms-webapp/master/setup-server.ps1'); Invoke-Expression $script
```

**Lệnh này sẽ tự động làm gì?**
1. Cài đặt Node.js, Git, Docker Desktop và Ollama (qua winget).
2. Tự động `git clone` dự án về Desktop.
3. Tự động `npm install` và cài đặt Claude Code.
4. Cấu hình sẵn sàng các file môi trường mẫu.

---

## 🚀 Cách 2: Cài đặt thủ công (Nếu cách 1 lỗi)

Hãy tải và cài đặt các phần mềm sau theo thứ tự:

1. **Node.js (LTS):** [Tải tại đây](https://nodejs.org/) (Chọn bản Long Term Support).
2. **Git for Windows:** [Tải tại đây](https://git-scm.com/download/win).
3. **Docker Desktop:** [Tải tại đây](https://www.docker.com/products/docker-desktop/) (Để chạy PostgreSQL và các dịch vụ sau này).
4. **Ollama:** [Tải tại đây](https://ollama.com/) (Để tận dụng sức mạnh GPU RTX 3060 cho AI).

---

## 2. Kéo dự án về máy (Clone Project)

Mở **PowerShell** hoặc **Command Prompt** và chạy các lệnh sau:

```powershell
# Di chuyển đến thư mục làm việc (Ví dụ: Desktop)
cd ~/Desktop

# Kéo mã nguồn từ GitHub
git clone https://github.com/trucdienhapulico-ai/cmms-webapp.git

# Di chuyển vào thư mục dự án
cd cmms-webapp

# Cài đặt các thư viện cần thiết
npm install
```

---

## 3. Xác thực AI (Lựa chọn phương thức)

Claude Code cần được xác thực để có thể bắt đầu làm việc. Bạn chọn một trong hai cách sau:

### Cách A: Đăng nhập OAuth (Khuyên dùng cho người dùng cá nhân/Pro)
Cách này không cần API Key, chỉ cần đăng nhập qua trình duyệt:
```powershell
claude auth login
```

### Cách B: Sử dụng API Key (Dành cho nhà phát triển)
Nếu bạn có mã API Key từ Anthropic, hãy thiết lập biến môi trường:
```powershell
$env:ANTHROPIC_API_KEY="your_api_key_here"
```

---

## 4. Tối ưu AI cục bộ với Ollama (RTX 3060)

Sau khi cài đặt Ollama, hãy mở Terminal và chạy lệnh sau để tải mô hình AI:

```powershell
# Tải và chạy thử mô hình Llama 3 (Rất nhanh trên RTX 3060)
ollama run llama3
```

---

## 5. Ví dụ Giao việc (Hello World)

Để kiểm tra xem AI đã hoạt động đúng chưa, bạn hãy thử các lệnh sau trong Terminal:

### Thử nghiệm Claude Code:
Sau khi đã đăng nhập thành công, hãy chạy lệnh:
```powershell
claude -p "Hãy nói Hello World bằng tiếng Việt và cho biết bạn đã sẵn sàng hỗ trợ dự án CMMS chưa?"
```

### Thử nghiệm AI cục bộ (Ollama):
Nếu bạn đã cài đặt Ollama và tải mô hình Llama 3, hãy chạy lệnh:
```powershell
ollama run llama3 "Hello World, give me a short technical tip for maintaining a backup generator."
```

### Ủy thác việc cho Worker qua GitHub CLI:
Để giao một Task mới cho hệ thống tự động làm (Worker), bạn có thể tạo Issue ngay từ Terminal:
```powershell
gh issue create --title "issue_auto_test" --body "Hãy tạo một file tên là test_done.txt trong thư mục gốc để xác nhận bạn đã nhận việc."
```
*Lưu ý: Sau khi gõ lệnh này, Worker đang chạy `.\claude-worker.ps1` sẽ tự động phát hiện Issue mới và thực hiện.*

---

## 6. Truy cập công khai qua Cloudflare Tunnel ⭐ (Khuyên dùng)

**Cloudflare Tunnel** là giải pháp chuẩn để expose CMMS ra internet.
Không cần cấu hình router, không cần IP tĩnh, HTTPS tự động miễn phí.

### Kiến trúc

```
Internet
    │  (HTTPS — *.trycloudflare.com hoặc domain riêng)
    ▼
Cloudflare Edge
    │  (outbound tunnel — không cần port forward)
    ▼
cloudflared (chạy trên PC)
    │
    ▼
CMMS WebApp (http://localhost:3090)
```

---

### Bước 1 — Cài đặt cloudflared

```powershell
# Cách 1: winget (khuyên dùng)
winget install Cloudflare.cloudflared

# Cách 2: Chocolatey
choco install cloudflared
```

Kiểm tra:
```powershell
cloudflared --version
```

---

### Bước 2A — Quick Tunnel (Foreground, URL tạm thời)

Không cần tài khoản. URL thay đổi mỗi lần khởi động lại.

```powershell
# Khởi động server trước
node server.js

# Mở terminal mới, chạy tunnel
.\scripts\start-tunnel.ps1
```

Script tự động tìm `cloudflared` trong PATH và các thư mục cài đặt phổ biến.

Output mẫu:
```
=== CMMS Cloudflare Tunnel ===
Binary : C:\Program Files\cloudflared\cloudflared.exe
Version: cloudflared version 2025.x.x

Mode: Quick Tunnel (temporary URL, no account needed)
A *.trycloudflare.com URL will appear in the output below.

2026-05-07T10:00:00Z INF | https://random-words-here.trycloudflare.com |
```

---

### Bước 2B — Quick Tunnel (Background, tồn tại sau khi đóng terminal)

Chạy tunnel ẩn trong nền. URL được tự động lưu vào `logs\tunnel-url.log`.

```powershell
.\scripts\start-tunnel-bg.ps1
```

Output mẫu:
```
=== CMMS Cloudflare Tunnel (Background) ===
Tunnel process started (PID 12345).
Waiting for public URL (up to 30 seconds)...

══════════════════════════════════════════════════
  PUBLIC URL: https://random-words.trycloudflare.com
══════════════════════════════════════════════════

URL saved : logs\tunnel-url.log
PID file  : logs\tunnel.pid
```

Dừng tunnel:
```powershell
Stop-Process -Name cloudflared -Force
```

---

### Bước 3 — Tự động khởi động cùng Windows

Chạy `install-tunnel-service.ps1` (cần quyền Administrator):

```powershell
# Chạy với quyền Administrator
.\scripts\install-tunnel-service.ps1
```

**Menu tương tác sẽ hiện ra:**

```
[1] Quick Tunnel  — Task Scheduler, auto-starts at Windows logon
     No account needed. URL changes each restart.
[2] Named Tunnel  — Windows Service, fixed URL (production-ready)
     Requires a free Cloudflare account + domain managed by Cloudflare.
[3] Uninstall     — Remove scheduled task and/or Windows service
```

#### Lựa chọn 1: Quick Tunnel tự động (Đơn giản nhất)
- Không cần tài khoản Cloudflare.
- Tunnel tự khởi động lúc Windows login.
- URL thay đổi mỗi lần restart — xem URL hiện tại tại `logs\tunnel-url.log`.

#### Lựa chọn 2: Named Tunnel Windows Service (URL cố định)
- Cần tài khoản Cloudflare miễn phí.
- Cần domain được quản lý bởi Cloudflare (có thể dùng subdomain `workers.dev` miễn phí).
- URL cố định, tunnel tự động khởi động cùng Windows (ngay cả khi chưa login).

**Lưu ý về domain cho Named Tunnel:**
> Bạn **không cần mua domain**. Cloudflare cung cấp subdomain `yourname.workers.dev` miễn phí.
> Kích hoạt tại Cloudflare Dashboard → Workers & Pages → tên account → workers.dev.

**Quản lý Windows Service:**
```powershell
Start-Service cloudflared
Stop-Service  cloudflared
Get-Service   cloudflared
```

---

### So sánh các chế độ Cloudflare Tunnel

| Chế độ | Script | URL | Tài khoản | Tự động khởi động |
|--------|--------|-----|-----------|-------------------|
| Quick (foreground) | `start-tunnel.ps1` | Tạm thời | Không cần | Không |
| Quick (background) | `start-tunnel-bg.ps1` | Tạm thời | Không cần | Thủ công |
| Quick (Task Scheduler) | `install-tunnel-service.ps1 [1]` | Tạm thời | Không cần | Có (at logon) |
| Named (Windows Service) | `install-tunnel-service.ps1 [2]` | Cố định | Cần | Có (auto) |

---

## 7. Truy cập công khai qua DuckDNS (Phương án thay thế)

> **Khi nào dùng?** Chỉ dùng DuckDNS nếu bạn có thể cấu hình port forwarding trên router.
> Nếu không, hãy dùng Cloudflare Tunnel (Mục 6) — dễ hơn và an toàn hơn.

Phần này hướng dẫn cách expose CMMS WebApp (port 3090) ra internet qua domain DuckDNS miễn phí kết hợp port forwarding.

### Kiến trúc

```
Internet (montanagc.duckdns.org)
    │
    ▼
Router/Modem  ──  Port Forward: 80 hoặc 3090 → PC:3090
    │
    ▼
CMMS WebApp (http://localhost:3090)
```

---

### Bước 1 — Lấy DuckDNS Token

1. Truy cập [https://www.duckdns.org](https://www.duckdns.org) và đăng nhập (Google/GitHub).
2. Tạo subdomain `montanagc` (nếu chưa có).
3. Sao chép **token** hiển thị trên trang (UUID dạng `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`).

---

### Bước 2 — Điền token vào file `.env`

Mở file `.env` trong thư mục dự án và điền token:

```
DUCKDNS_TOKEN=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
DUCKDNS_DOMAIN=montanagc
```

---

### Bước 3 — Chạy thử script cập nhật IP

```powershell
# Chạy từ thư mục dự án
$env:DUCKDNS_TOKEN = "your_token_here"
.\scripts\duckdns-update.ps1
```

Output thành công:
```
[2026-05-06 10:00:00] OK — montanagc.duckdns.org updated to 203.0.113.1
```

Log được lưu tại `logs\duckdns.log`.

---

### Bước 4 — Lên lịch tự động (Task Scheduler)

Cài đặt Task Scheduler để cập nhật IP mỗi 5 phút:

```powershell
# Chạy với quyền Administrator
$action  = New-ScheduledTaskAction -Execute "powershell.exe" `
             -Argument "-NonInteractive -ExecutionPolicy Bypass -File `"$PWD\scripts\duckdns-update.ps1`""
$trigger = New-ScheduledTaskTrigger -RepetitionInterval (New-TimeSpan -Minutes 5) -Once -At (Get-Date)
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable

Register-ScheduledTask -TaskName "CMMS-DuckDNS-Update" `
    -Action $action -Trigger $trigger -Settings $settings `
    -Description "Cập nhật IP cho montanagc.duckdns.org mỗi 5 phút" `
    -RunLevel Highest -Force
```

---

### Bước 5 — Port Forwarding trên Router

Đăng nhập vào trang quản trị router (thường `192.168.1.1` hoặc `192.168.0.1`) và tạo rule:

| Giao thức | Port ngoài (WAN) | Port trong (LAN) | IP đích (PC nội bộ) |
|-----------|-----------------|-----------------|---------------------|
| TCP       | 3090            | 3090            | IP LAN của PC (ví dụ: 192.168.1.100) |
| TCP       | 80              | 3090            | IP LAN của PC (tuỳ chọn, cho port 80) |

> **Tìm IP LAN của PC:** Chạy `ipconfig` trong PowerShell, xem địa chỉ IPv4 của adapter đang dùng.

> **Lưu ý ISP:** Một số ISP Việt Nam block port 80/443 trên gói dân dụng.
> Nếu bị block, dùng port 3090 và truy cập qua `http://montanagc.duckdns.org:3090`.

---

### Bước 6 — Kiểm tra truy cập công khai

```powershell
# Kiểm tra DNS đã cập nhật chưa
Resolve-DnsName montanagc.duckdns.org

# Kiểm tra app từ ngoài (thay bằng IP công khai thực tế)
curl http://montanagc.duckdns.org:3090/api/health
```

---

### Nâng cấp HTTPS (tuỳ chọn, khuyến nghị)

Để có HTTPS miễn phí, dùng **Nginx + Certbot** làm reverse proxy:

```powershell
# Cài Nginx (qua Chocolatey)
choco install nginx -y

# Cài Certbot cho Windows
choco install certbot -y

# Sau khi cài: certbot --nginx -d montanagc.duckdns.org
```

---

### So sánh Cloudflare Tunnel vs DuckDNS

| Tiêu chí | Cloudflare Tunnel | DuckDNS + Port Forward |
|---|---|---|
| Cần cấu hình router | Không cần | Bắt buộc |
| HTTPS | Tự động (miễn phí) | Cần Nginx + Certbot |
| URL cố định | Quick: tạm thời / Named: cố định | Có (subdomain.duckdns.org) |
| Độ trễ | Thấp (Cloudflare edge gần VN) | Thấp (kết nối thẳng) |
| Bảo mật | Cloudflare WAF bảo vệ | Tự quản lý |
| Yêu cầu tài khoản | Không (Quick) / Có (Named) | Không (DuckDNS miễn phí) |

---

© 2026 - CMMS System Infrastructure Guide
