# 🚀 Hướng dẫn Triển khai Hermes Agent (Docker) & Tích hợp CMMS API

Tài liệu này là bản đặc tả kỹ thuật dành cho Trợ lý AI (hoặc Kỹ sư Hệ thống) đang chạy trên máy chủ Ubuntu. Mục tiêu là cài đặt **Hermes Agent** qua Docker và lập trình cho nó khả năng tự động theo dõi (monitor) hệ thống CMMS thông qua API.

---

## 1. Cài đặt Hermes Agent qua Docker (Trên Ubuntu)

Hermes Agent (từ Nous Research) là một framework agent tự chủ, có bộ nhớ dai dẳng (persistent memory) và khả năng tự học các kỹ năng mới (skills).

### 1.1. Chuẩn bị thư mục & Môi trường

Mở terminal trên Ubuntu và chạy các lệnh sau:

```bash
# Tạo thư mục làm việc
mkdir -p ~/hermes-cmms-agent && cd ~/hermes-cmms-agent

# Tạo thư mục lưu trữ dữ liệu (Memory & DB)
mkdir -p ./data
```

Tạo file `.env` chứa các biến môi trường cấu hình LLM. (Bạn có thể sử dụng Gemini miễn phí, hoặc dùng gói **Codex Pro** thông qua Proxy):

```bash
cat << 'EOF' > .env
# --- CẤU HÌNH LLM (Chọn 1 trong 3 tùy chọn dưới đây) ---

# Tùy chọn A: Dùng Google Gemini (Khuyên dùng - Nhanh & Rộng)
# LLM_PROVIDER=gemini
# GEMINI_API_KEY=YOUR_GEMINI_API_KEY_HERE
# MODEL_NAME=gemini-2.5-flash

# Tùy chọn B: Dùng OpenRouter
# LLM_PROVIDER=openrouter
# OPENROUTER_API_KEY=YOUR_OPENROUTER_API_KEY_HERE
# MODEL_NAME=meta-llama/llama-3-8b-instruct:free

# Tùy chọn C: Dùng gói Github Copilot / Codex Pro (Thông qua Proxy)
# *Yêu cầu: Phải cấu hình chạy thêm copilot-proxy trong docker-compose*
LLM_PROVIDER=openai
OPENAI_BASE_URL=http://localhost:3000/v1
OPENAI_API_KEY=dummy-key
MODEL_NAME=claude-3-5-sonnet

# --- CẤU HÌNH CMMS ENDPOINT ---
CMMS_API_URL=http://<IP_CỦA_NAS>:3090/api
CMMS_WEB_URL=http://<IP_CỦA_NAS>:8081
EOF
```

### 1.2. Tạo file `docker-compose.yml`

Tạo file `docker-compose.yml` với nội dung sau. Cấu hình này đã được cập nhật để chạy song song **Copilot Proxy** (nếu bạn dùng Tùy chọn C ở trên):

```yaml
version: "3.9"

services:
  # ─── Copilot Proxy (Dành cho Tùy chọn C - Codex Pro) ───
  copilot-proxy:
    image: ghcr.io/ericc-ch/copilot-api:latest
    container_name: hermes-copilot-proxy
    restart: unless-stopped
    ports:
      - "3000:8080"
    volumes:
      # Lấy file token từ máy cá nhân lên Ubuntu thông qua SSH
      - ./github-copilot-token.json:/app/token.json:ro
      
  # ─── Hermes AI Agent ───
  hermes-agent:
    # Tham khảo image chính thức của Hermes hoặc build từ source
    image: nousresearch/hermes-agent:latest 
    container_name: hermes-cmms-agent
    restart: unless-stopped
    env_file:
      - .env
    volumes:
      - ./data:/app/data          # Lưu trữ memory và skills
      - ./skills:/app/skills      # Thư mục chứa custom scripts (CMMS API)
    networks:
      - host                      # Dùng host network để dễ ra internet/LAN
    depends_on:
      - copilot-proxy
```

**⚠️ Hướng dẫn copy token Codex Pro qua SSH:**
Nếu bạn dùng tuỳ chọn C, bạn cần copy file token Github Copilot (tìm thấy trên máy Windows tại `C:\Users\<Tên_Bạn>\AppData\Local\github-copilot\apps.json`) lên máy Ubuntu.
Chạy lệnh sau trên máy Windows của bạn (thay IP và username):
```bash
scp "C:\Users\vitmo.WINDOWS11PRO\AppData\Local\github-copilot\apps.json" username@IP_UBUNTU:~/hermes-cmms-agent/github-copilot-token.json
```

Khởi chạy hệ thống:
```bash
docker compose up -d
```

---

## 2. Kịch bản AI Giao tiếp CMMS (Tự động theo dõi)

Bản chất của Hermes là hoạt động dựa trên các **Skills** (Kỹ năng) bằng Python hoặc JS. Chúng ta sẽ dạy Hermes một Skill: Gọi API của CMMS mỗi 30 phút để quét các Lệnh bảo trì (Work Orders) khẩn cấp.

### 2.1. API endpoint của CMMS cần sử dụng

Giả định hệ thống CMMS của chúng ta (chạy trên NAS) mở các API sau tại port `3090`:
- **GET** `http://<IP_NAS>:3090/api/work-orders` : Lấy danh sách lệnh bảo trì.
- **GET** `http://<IP_NAS>:3090/api/assets/{id}` : Lấy thông tin thiết bị.

### 2.2. Viết Custom Skill cho Hermes Agent

Tạo một file Python trong thư mục `skills/` trên máy Ubuntu để Hermes sử dụng. File này sẽ gọi API của CMMS.

```bash
mkdir -p ~/hermes-cmms-agent/skills
cat << 'EOF' > ~/hermes-cmms-agent/skills/monitor_cmms.py
import requests
import os
import time

CMMS_API_URL = os.getenv("CMMS_API_URL", "http://localhost:3090/api")

def check_emergency_work_orders():
    """
    Kỹ năng này kết nối vào CMMS để tìm các Work Order có trạng thái 'Emergency' hoặc 'Open'
    chưa được xử lý.
    """
    try:
        response = requests.get(f"{CMMS_API_URL}/work-orders")
        if response.status_code == 200:
            work_orders = response.json()
            alerts = []
            
            for wo in work_orders:
                # Tìm các lỗi Khẩn cấp hoặc Đang mở
                if wo.get('priority') == 'high' and wo.get('status') == 'open':
                    alerts.append(f"⚠️ [KHẨN CẤP] {wo['id']} - {wo['title']} (Thiết bị: {wo['assetId']})")
            
            if alerts:
                return "\n".join(alerts)
            else:
                return "Hệ thống CMMS bình thường, không có lệnh khẩn cấp."
        else:
            return f"Lỗi khi kết nối CMMS: HTTP {response.status_code}"
    except Exception as e:
        return f"Không thể kết nối đến CMMS: {str(e)}"

# Logic tự động chạy (Loop / Cron) được quản lý bởi não bộ Hermes
EOF
```

### 2.3. Hướng dẫn cho AI (Prompt Khởi tạo)

Khi đã cài đặt xong, bạn hãy chat với Hermes (qua CLI, Web UI hoặc Telegram bot tích hợp của nó) với Prompt sau để nó tự động hóa công việc:

> *"Chào Hermes. Từ hôm nay, bạn là Trợ lý Giám sát Hệ thống Cơ điện (CMMS). Bạn đã được cung cấp một kỹ năng (skill) có tên là `check_emergency_work_orders` dùng để kết nối với server CMMS qua API.
> Nhiệm vụ của bạn là: Cứ mỗi 30 phút, hãy tự động kích hoạt kỹ năng này. Nếu nhận được danh sách cảnh báo (có lỗi Khẩn Cấp), hãy lập tức gửi báo cáo tóm tắt cho tôi qua kênh giao tiếp này."*

---

## 3. Cách kết nối Network (Ubuntu -> NAS CMMS)

Vì CMMS nằm ở NAS, và AI Agent nằm ở Ubuntu, cần đảm bảo:
1. **Ping thông mạng:** Máy Ubuntu phải ping được địa chỉ IP LAN của NAS (ví dụ: `ping 192.168.1.100`).
2. **Mở Port:** Đảm bảo NAS không block Port `3090` (API) và `8081` (Web) từ địa chỉ IP của máy Ubuntu.
3. Thay thế `<IP_CỦA_NAS>` trong file `.env` bằng địa chỉ IP LAN thực tế của Synology NAS.

---

## Dành cho Trợ lý AI (AI System Prompt)
*If you are an AI reading this file on the Ubuntu host: Please proceed to execute the bash commands in Section 1 to construct the workspace. If the user opted for Option C (Codex Pro), ensure the `github-copilot-token.json` exists before running `docker compose up -d`. Inject the Python skill in Section 2 into the skills directory. Then start the stack.*
