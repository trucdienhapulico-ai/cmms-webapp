# CMMS WebApp Roadmap (Updated: 2026-05-11)

## Phase 1: MVP - Foundation & Core Maintenance ✅ DONE
Mục tiêu: Thiết lập nền tảng, quản lý tài sản và quy trình sửa chữa cơ bản.

- [x] **Basic Auth**: Login, roles (Admin, Manager, Operator, Viewer).
- [x] **Asset Management (Basic)**: Danh sách thiết bị, thông số kỹ thuật.
- [x] **Work Orders (Basic)**: Tạo, giao, cập nhật trạng thái lệnh công việc.
- [x] **Dashboard View**: Tổng quan số lượng WO, thiết bị.
- [x] **Asset Tree Hierarchy**: Phân cấp Tòa nhà -> Hệ thống M&E -> Thiết bị (theo Tab 3.4.1).
- [x] **Mobile-friendly UI**: Tối ưu Dashboard, Assets, Work Orders cho kỹ thuật viên hiện trường (Issue #9).
- [x] **DevOps**: Setup Hosting (Stable & Test environments) với Docker Compose.
- [x] **QR Code & Checklist Integration**: Scan mã thiết bị để xem hồ sơ và thực hiện checklist số (Issue #8).

## Phase 2: Operational Excellence - PM & Inventory ✅ DONE
Mục tiêu: Số hóa quy trình bảo trì phòng ngừa và quản lý kho vật tư.

- [x] **Preventive Maintenance (PM)**: Lập kế hoạch PM theo chu kỳ, Calendar view, Thư viện Template Checklist/SOP.
- [x] **Inventory Management**: Danh mục vật tư, Nhập/Xuất kho liên kết WO, Cảnh báo tồn kho thấp.
- [x] **Tenant Portal**: Trang báo cáo sự cố đơn giản cho cư dân/khách hàng (Tab 4.11).
- [x] **Notifications**: Push/Email thông báo khi có WO mới, quá hạn.
- [x] **UI Map Maintenance (Issue #18)**: Rà soát & bổ sung đầy đủ mã định vị cho tất cả khu vực giao diện.

## Phase 3: Analytics & Advanced Features ✅ DONE
Mục tiêu: Tối ưu hóa hiệu suất qua dữ liệu và mở rộng tính năng quản lý.

- [x] **Advanced Dashboard & Analytics**: KPI MTTR/MTBF/PM Compliance, biểu đồ xu hướng sự cố (Issue #19).
- [x] **HR & Scheduling**: Quản lý lịch trực ca, workload kỹ thuật viên, Check-in/out (Issue #20).
- [x] **Advanced Inventory**: Purchase Orders (PO), phê duyệt mua hàng, quản lý Vendor (Issue #22).
- [x] **System Integration**: Backup tự động, Audit log, Webhooks/API cho BMS/IoT (Issue #21, #23).
- [x] **Safety & Infrastructure**: Tách biệt Test/Stable, Auth UX & Admin Password Reset (Issue #27, #28).
- [x] **Health & Quality**: Hệ thống Audit & Operational Health Check, Dark Mode (Issue #24, #26).
- [x] **Emergency & Maintenance**:
    - Emergency Stable Environment Debugging & Recovery (Issue #29 — completed with partial failure noted).
    - Full Project Backup & GitHub Checkpoint (Issue #30).
    - Disaster Recovery & Restore Guide (Issue #31).

---

## Phase 3.5: Hardening & Deployment ✅ PHẦN LỚN HOÀN THÀNH
Mục tiêu: Củng cố bảo mật, an toàn dữ liệu, triển khai NAS/Cloudflare. AI review ngày 2026-05-06.

### ✅ Đã hoàn thành
- [x] **Security Hardening — Secret Exposure Response** (Issue #32 ✅ 2026-05-10):
    - Gỡ SSH/sudo credentials, Cloudflare token và secrets hardcoded khỏi code.
    - Chuyển sang biến môi trường `.env` cho tất cả secrets.
    - Bổ sung `.env.example` và tài liệu rotate/revoke.
- [x] **Runtime Data & Backup Hygiene** (Issue #32 ✅):
    - Loại bỏ tracking `data/*.json`, backup files, logs khỏi git.
    - Seed/demo data đã sanitize cho onboarding.
- [x] **Stored XSS Remediation** (Issue #33 ✅ 2026-05-10):
    - Thêm helper `escapeHtml`, rà soát toàn bộ `innerHTML` trong `index.html` và `tenant.html`.
    - Kiểm tra Work Orders, Assets, Tenant, Vendors, PO, Notifications, Webhooks.
- [x] **Auth Bootstrap Hardening** (Issue #33 ✅):
    - Loại bỏ bootstrap `admin/admin`, bắt buộc `INITIAL_ADMIN_PASSWORD` cho production.
    - Gắn `mustChangePassword` cho admin khởi tạo và cập nhật `.env.example`.
- [x] **Authorization & Session Fixes** (Issue #28 ✅):
    - Sửa shift check-in/check-out từ `session.id` → `session.userId`.
    - Trả về `403` đúng cho truy cập trái phép.
- [x] **Atomic Persistence & Recovery** (Issue #34 ✅ 2026-05-10):
    - Chuyển `saveDB()` sang temp file + rename (tránh ghi dở `db.json`).
    - Write queue/mutex và `.bak` last-known-good copy.
- [x] **NAS Migration & Docker Setup** (✅ 2026-05-11):
    - Triển khai app lên NAS Synology qua Docker Compose.
    - Docker image build và verify admin login thành công.
- [x] **Public Access via Cloudflare Tunnel** (Issues #35-38 ✅ 2026-05-11):
    - Expose domain public qua Cloudflare Zero Trust Tunnel (Issue #35).
    - Cài đặt và cấu hình cloudflared service (Issue #36).
    - Fix lỗi login qua tunnel (Issue #37).
    - Finalize và verify toàn bộ Cloudflare setup (Issue #38).

### 🔜 Còn lại — UPCOMING PRIORITY
- [ ] **API Key, Webhook & Header Hardening** ← **NEXT P1**:
    - Chuyển API key storage sang dạng hash, chỉ hiển thị raw key một lần khi tạo.
    - Bổ sung timeout, response-size limit và hạn chế private destinations cho webhook (giảm SSRF risk).
    - Thêm CSP và security headers sau khi hoàn tất cleanup XSS.
- [ ] **Post-Fix Maintainability Refactor** ← **P2**:
    - Tách `server.js` thành `routes/*`, `lib/db.js`, `lib/auth.js`.
    - Tách frontend render helpers và API client ra khỏi file HTML lớn.

---

## 🚀 Phase 4: Scaling & High Performance
Mục tiêu: Chuyển đổi công nghệ để chịu tải lớn và đa nền tảng.

- [ ] **PostgreSQL Migration** ← **NEXT P1**: Chuyển đổi từ JSON file sang PostgreSQL (`scripts/migrate-to-pg.js` đã có).
- [ ] **Architecture Refactor**: Chuyển đổi sang **Next.js 15** (App Router) để tối ưu SEO và tốc độ.
- [ ] **Mobile App (Beta)**: Triển khai bản **Expo** cho kỹ thuật viên với tính năng Offline.
- [ ] **Smart Maintenance**: Dự báo hỏng hóc (Predictive Maintenance) dựa trên AI/Machine Learning.

---

## 🛡️ AI Governance & Workflow Rules
1. **Task Generation**: Claude Code KHÔNG ĐƯỢC PHÉP tự động tạo file `.txt` trong `tasks_queue` vượt quá 3 issue mỗi lần.
2. **Approval Required**: Mọi task tự tạo phải được liệt kê trong `brain/tasks_proposal` để Admin duyệt trước khi thực thi.
3. **Queue Limit**: Hàng đợi thực thi tối đa là **5 Task**. Nếu vượt quá, các task mới sẽ bị tạm dừng (Paused).
4. **Execution Safeguard**: Mỗi Task giới hạn tối đa **15 phút**. Quá thời gian hệ thống sẽ tự ngắt để bảo vệ tài nguyên.
