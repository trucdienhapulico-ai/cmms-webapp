# CMMS – Hệ thống Quản lý Bảo trì Cơ điện (M&E)

## Tổng quan dự án

Web app CMMS nội bộ cho quản lý bảo trì hệ thống cơ điện tòa nhà/sân golf.
Tài liệu nghiên cứu: `docs/CMMS-Research-Building-ME-Maintenance.html` (repo vanhanh)

**Repo:** https://github.com/trucdienhapulico-ai/cmms-webapp  
**Stack:** Node.js + Express (backend), HTML/JS thuần (frontend), JSON file DB  
**Port dev:** http://localhost:3090

---

## Kiến trúc hệ thống

```
cmms-webapp/
├── server.js          # Express server + API routes
├── public/            # Frontend (HTML/CSS/JS)
│   ├── index.html     # Shell chính + router
│   ├── css/
│   └── js/
├── data/
│   └── db.json        # Database JSON
├── .claude/
│   └── settings.json  # Auto-permissions
└── CLAUDE.md          # File này
```

---

## Các module cần xây dựng (theo thứ tự ưu tiên)

### MVP (Phase 1)
- [ ] **Auth** – Đăng nhập, session, 4 roles: admin/manager/operator/viewer
- [ ] **Work Orders** – Tạo, giao, theo dõi lệnh công việc
- [ ] **Assets** – Danh sách thiết bị, thông tin kỹ thuật
- [ ] **Dashboard** – Tổng quan số liệu realtime

### Phase 2
- [ ] **PM Scheduling** – Lịch bảo trì định kỳ, nhắc nhở
- [ ] **Inventory** – Quản lý vật tư, phụ tùng
- [ ] **Checklist** – Checklist kiểm tra theo ca/thiết bị
- [ ] **Reports** – Báo cáo xuất CSV/PDF

### Phase 3
- [ ] **Mobile-friendly** – Responsive cho tablet/điện thoại
- [ ] **Photo upload** – Đính kèm ảnh vào work order
- [ ] **Notifications** – Email/webhook khi có lệnh mới

---

## Quy ước code

- **API:** RESTful, prefix `/api/`, trả JSON `{ok: 1, data: ...}` hoặc `{ok: 0, error: "..."}`
- **Auth:** Cookie-based session, PBKDF2+SHA256 cho mật khẩu
- **DB:** JSON file `data/db.json`, backup tự động
- **Frontend:** Vanilla JS, không dùng framework nặng, mobile-first
- **Port:** 3090 (tránh conflict với ops-standard:3080)

---

## Cách nhận task từ xa (GitHub Issues Workflow)

Chủ project tạo GitHub Issue từ bất kỳ đâu (điện thoại, máy khác):
- Tiêu đề: `[TASK] Mô tả ngắn gọn`
- Nội dung: Chi tiết yêu cầu, acceptance criteria
- Label: `claude-todo`

Claude sẽ tự động nhận, implement và tạo PR.

---

## Lệnh thường dùng

```bash
# Chạy dev server
node server.js

# Test API
curl http://localhost:3090/api/health

# Kiểm tra GitHub Issues chờ xử lý
gh issue list --label claude-todo --repo trucdienhapulico-ai/cmms-webapp

# Push code
git add -A && git commit -m "..." && git push origin main
```

---

## Tài khoản mặc định (dev)
- admin / admin123 (đổi trước khi deploy)
