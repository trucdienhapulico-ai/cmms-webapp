# Hướng dẫn Thiết lập Máy chủ CMMS & AI (Dành cho máy Core i7 / RTX 3060)

Tài liệu này hướng dẫn cách biến máy tính Windows của bạn thành trung tâm điều hành CMMS, tích hợp AI cục bộ và tự động hóa với Claude Code.

---

## 1. Cài đặt Môi trường (Prerequisites)

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

## 3. Cài đặt Claude Code (AI Agent)

Cài đặt công cụ hỗ trợ lập trình của Anthropic:

```powershell
# Cài đặt toàn cục
npm install -g @anthropic-ai/claude-code

# Đăng nhập (Làm theo hướng dẫn hiện ra trên màn hình)
claude auth login
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
