# Hướng dẫn Thiết lập Máy chủ CMMS & AI (Duy nhất 1 lệnh)

Tài liệu này cung cấp phương thức cài đặt tự động toàn bộ môi trường CMMS trên máy tính Windows Core i7 / RTX 3060.

---

## 🚀 Cách 1: Cài đặt tự động (Khuyên dùng)

Bạn chỉ cần mở **PowerShell với quyền Administrator**, sao chép và dán lệnh sau:

```powershell
Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.SecurityProtocolType]::Tls12; $script = (New-Object System.Net.WebClient).DownloadString('https://raw.githubusercontent.com/trucdienhapulico-ai/cmms-webapp/checkpoint-pre-phase4/init-pc.ps1'); Invoke-Expression $script
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

## 5. Chạy Worker tự động hóa

Để máy tính tự động nhận việc và sửa code thông qua GitHub Issues:

```powershell
# Đảm bảo bạn đang ở trong thư mục cmms-webapp
.\claude-worker.ps1
```

---

## 6. Địa chỉ truy cập cục bộ (Local Access)

Sau khi chạy lệnh `npm start` hoặc `node server.js`, bạn có thể truy cập hệ thống tại:
- **Địa chỉ:** `http://localhost:3090` hoặc `http://IP_CUA_MAY:3090`

---
© 2026 - CMMS System Infrastructure Guide
