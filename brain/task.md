# Current Tasks (Updated: 2026-05-11)

## 🔴 Active (In Progress)
- [ ] **Task [Migration]**: NAS Setup and Data Migration (Added to queue)
- [ ] **Task [Migration]**: WebApp Initialization and Obsidian Config (Added to queue)
- [ ] **Task [Migration]**: Final Migration Review and Report (Added to queue)
- [ ] **Task [SecondBrain]**: Structure & Templates (Added to queue)
- [ ] **Task [SecondBrain]**: Community Plugins Setup (Added to queue)
- [ ] **Task [SecondBrain]**: Dashboards Integration (Added to queue)

---

## ✅ Recently Completed (Sprint 2026-05)
| Task | Issue | Ngày hoàn thành |
|------|-------|-----------------|
| Auth UX & Admin Password Reset | #28 | 2026-05 |
| Security Hardening — Secret Sanitization | #32 | 2026-05-10 |
| XSS Remediation + Auth Bootstrap Hardening | #33 | 2026-05-10 |
| Atomic Persistence (saveDB temp+rename) | #34 | 2026-05-10 |
| Expose Public Domain via Cloudflare | #35 | 2026-05-11 |
| Install & Configure Cloudflare Tunnel | #36 | 2026-05-11 |
| Fix Login via Tunnel | #37 | 2026-05-11 |
| Finalize Cloudflare Setup | #38 | 2026-05-11 |
| NAS Migration & Docker Setup | Docker | 2026-05-11 |
| Fix Login Final — reset admin password, verify auth chain | #39 | 2026-05-11 |
| **Gỡ bỏ Cloudflare Tunnel & Chuyển về Local** | Infra | 2026-05-11 |

---

## 🔜 Upcoming (Ưu tiên theo thứ tự)

### P1 — Làm ngay sau Issue #39
- [ ] **API Key & Webhook Hardening** (Phase 3.5):
    - Hash API keys, chỉ hiển thị raw key một lần khi tạo.
    - Webhook: timeout + response-size limit + block private destinations (chống SSRF).
    - Thêm CSP header và security headers.
- [ ] **PostgreSQL Migration** (Phase 4):
    - Dùng `scripts/migrate-to-pg.js` để chuyển dữ liệu từ `db.json` sang PostgreSQL.
    - Cập nhật `lib/db.js` để dùng Prisma/pg thay vì JSON file.
    - Cập nhật Docker Compose thêm service `postgres`.

### P2 — Sau khi P1 ổn định
- [ ] **Post-Fix Refactor** (Phase 3.5):
    - Tách `server.js` → `routes/*`, `lib/auth.js`.
    - Tách frontend helpers ra khỏi `index.html`.
- [ ] **Architecture Refactor** (Phase 4):
    - Đánh giá chuyển sang Next.js 15 App Router.

### P3 — Dài hạn
- [ ] **Mobile App (Expo)** — Offline-first cho kỹ thuật viên hiện trường.
- [ ] **Predictive Maintenance** — AI/ML dự báo hỏng hóc.

---

## 📋 Quy tắc Queue
- Queue tối đa **5 task** đang chờ. Vượt quá → tạm dừng task mới.
- Task mới tự tạo phải qua `brain/tasks_proposal` → Admin duyệt → mới vào `tasks_queue`.
- Mỗi task giới hạn **15 phút** thực thi.
