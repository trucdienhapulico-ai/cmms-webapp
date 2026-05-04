# 🚀 CMMS WebApp - Hệ thống Quản lý Bảo trì Thông minh

### 🛠️ Cài đặt nhanh (Dành cho máy i7/RTX 3060 - Duy nhất 1 lệnh)
Mở PowerShell (Admin) và dán lệnh sau:
```powershell
Set-ExecutionPolicy Bypass -Scope Process -Force; [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; iex ((New-Object Net.WebClient).DownloadString('https://raw.githubusercontent.com/trucdienhapulico-ai/cmms-webapp/master/setup-server.ps1'))
```

---

Hệ thống quản lý bảo trì nội bộ phục vụ vận hành tòa nhà và hệ thống kỹ thuật.

## 🌐 Địa chỉ truy cập (Nội bộ)

- **Bản TEST (Thử nghiệm):** [http://192.168.86.139:8081](http://192.168.86.139:8081)
    - Dùng để kiểm tra tính năng mới, rà soát lỗi trước khi phát hành chính thức.
- **Bản STABLE (Chính thức):** [http://192.168.86.139:8080](http://192.168.86.139:8080)
    - Dùng cho vận hành thực tế. Dữ liệu được đồng bộ từ bản Test sau khi phê duyệt.

---

## 🚀 Quy trình Phát hành (Release Workflow)

Để đồng bộ các tính năng mới từ môi trường Phát triển sang môi trường Chính thức:

1. **Phát hành từ Giao diện (One-Click):**
   - Đăng nhập vào bản **TEST** (8081) với quyền Admin.
   - Truy cập menu **"Phát hành (Staging)"**.
   - Nhấn nút Mega Button: **"🚀 KÍCH HOẠT PHÁT HÀNH NGAY"**.
   - Hệ thống sẽ tự động đồng bộ mã nguồn và khởi động lại bản Stable.

2. **Phát hành từ Dòng lệnh (CLI):**
   - Chạy lệnh: `node deploy.js --stable` từ máy bộ để ép buộc cập nhật bản Stable.

---

## 🧹 Hướng dẫn Xóa Cache Chrome (Khi gặp lỗi hiển thị)

Nếu bạn vừa cập nhật hệ thống nhưng giao diện vẫn hiển thị bản cũ (hoặc bị lỗi bố cục), hãy thực hiện:

1. **Làm mới cưỡng bức (Hard Refresh):**
   - Nhấn tổ hợp phím `Ctrl` + `Shift` + `R` (Windows) hoặc `Cmd` + `Shift` + `R` (Mac).
2. **Xóa Cache cụ thể cho trang web:**
   - Nhấn `F12` (mở DevTools).
   - Chuột phải vào nút **Làm mới** (Reload) của trình duyệt.
   - Chọn **"Empty Cache and Hard Reload"**.
3. **Tắt Cache khi phát triển:**
   - Trong cửa sổ `F12` -> Tab **Network** -> Tích chọn **"Disable cache"**.

---

## 🌐 Xử lý lỗi truy cập từ mạng ngoài (Public URL)

Nếu bạn truy cập được vào [https://vanhanh.synology.me](https://vanhanh.synology.me) từ mạng nội bộ nhưng mạng ngoài (4G, Wifi khác) báo lỗi, hãy thực hiện các bước sau:

### 1. Xóa chính sách bảo mật cũ (HSTS Cache)
Đôi khi trình duyệt lưu thông tin SSL cũ gây xung đột. Hãy làm theo cách sau:
1. Mở Chrome và truy cập địa chỉ: `chrome://net-internals/#hsts`
2. Tìm đến phần **"Delete domain security policies"**.
3. Nhập tên miền: `vanhanh.synology.me` vào ô Domain.
4. Nhấn nút **Delete**.
5. Thử truy cập lại trang web.

### 2. Kiểm tra trạng thái SSL trên Synology
- Đảm bảo chứng chỉ **Let's Encrypt** cho domain `vanhanh.synology.me` vẫn còn hạn.
- Kiểm tra **Control Panel** -> **Security** -> **Certificate** trên Synology NAS.

### 3. Kiểm tra Firewall (Tường lửa)
- Đảm bảo cổng **80** và **443** đã được mở (Forward) trên Router tới địa chỉ IP của NAS.
- Kiểm tra Tường lửa của Synology (Security -> Firewall) xem có chặn các dải IP lạ hay không.

---

## 🛠️ Phát triển & Quản trị

- **Backend:** Node.js + Express.
- **Frontend:** Vanilla JS (Premium UI).
- **Database:** JSON File (Dự kiến chuyển sang PostgreSQL ở Phase 4).
- **Deployment:** Docker Compose trên Synology NAS.

---
© 2026 - CMMS Infrastructure Team
