# CMMS WebApp - Hệ thống Quản lý Bảo trì Cơ điện

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

## 🛠️ Phát triển & Quản trị

- **Backend:** Node.js + Express.
- **Frontend:** Vanilla JS (Premium UI).
- **Database:** JSON File (Dự kiến chuyển sang PostgreSQL ở Phase 4).
- **Deployment:** Docker Compose trên Synology NAS.

---
© 2026 - CMMS Infrastructure Team
