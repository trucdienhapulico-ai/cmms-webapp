# CMMS WebApp Roadmap (Updated based on Research)

## Phase 1: MVP - Foundation & Core Maintenance (Target: Month 1-2)
Mục tiêu: Thiết lập nền tảng, quản lý tài sản và quy trình sửa chữa cơ bản.

- [x] **Basic Auth**: Login, roles (Admin, Manager, Operator, Viewer).
- [x] **Asset Management (Basic)**: Danh sách thiết bị, thông số kỹ thuật.
- [x] **Work Orders (Basic)**: Tạo, giao, cập nhật trạng thái lệnh công việc.
- [x] **Dashboard View**: Tổng quan số lượng WO, thiết bị.
- [x] **Asset Tree Hierarchy**: Phân cấp Tòa nhà -> Hệ thống M&E -> Thiết bị (theo Tab 3.4.1).
- [x] **Mobile-friendly UI**: Tối ưu Dashboard, Assets, Work Orders cho kỹ thuật viên hiện trường (Issue #9).
- [x] **DevOps**: Setup Hosting (Stable & Test environments) với Docker Compose.
- [x] **QR Code & Checklist Integration**: Scan mã thiết bị để xem hồ sơ và thực hiện checklist số (Issue #8).

## Phase 2: Operational Excellence - PM & Inventory (Target: Month 2-3)
Mục tiêu: Số hóa quy trình bảo trì phòng ngừa và quản lý kho vật tư.

- [x] **Preventive Maintenance (PM)**: 
    - Lập kế hoạch PM theo chu kỳ (Time-based).
    - Calendar view cho lịch bảo trì (Tab 4.5).
    - Thư viện Template Checklist/SOP cho thiết bị M&E (Tab 3.3.3).
- [x] **Inventory Management**:
    - Danh mục vật tư, phụ tùng, vị trí kho.
    - Nhập/Xuất kho liên kết trực tiếp với Work Order (Tab 3.5.2).
    - Cảnh báo tồn kho thấp.
- [x] **Tenant Portal**: Trang báo cáo sự cố đơn giản cho cư dân/khách hàng (Tab 4.11).
- [x] **Notifications**: Push/Email thông báo khi có WO mới, quá hạn.
- [x] **UI Map Maintenance (Issue #18)**: Rà soát & bổ sung đầy đủ mã định vị cho tất cả khu vực giao diện.

## Phase 3: Analytics & Advanced Features (Target: Month 4+)
Mục tiêu: Tối ưu hóa hiệu suất qua dữ liệu và mở rộng tính năng quản lý.

- [x] **Advanced Dashboard & Analytics**:
    - KPI: MTTR, MTBF, PM Compliance rate (Tab 3.7.1).
    - Biểu đồ xu hướng sự cố và chi phí bảo trì (Issue #19).
- [x] **HR & Scheduling**:
    - Quản lý lịch trực ca, workload của kỹ thuật viên (Tab 4.15) (Issue #20).
    - Theo dõi giờ công thực tế qua Check-in/out.
- [x] **Advanced Inventory**:
    - Purchase Orders (PO) và quy trình phê duyệt mua hàng (Issue #22).
    - Quản lý nhà cung cấp (Vendor) và đánh giá chất lượng.
- [x] **System Integration**:
    - Backup tự động và Audit log hệ thống (Issue #21).
    - Webhooks/API cho tích hợp BMS/IoT tương lai (Issue #23).
- [x] **Safety & Infrastructure**:
    - Tách biệt môi trường Test/Stable và quy trình Phê duyệt (Issue #27).
    - Auth UX (Ghi nhớ mật khẩu) và Admin Password Reset (Issue #28).
    - Setup Multi-Agent Workflow (Claude + Copilot) (Issue #25).
- [x] **Health & Quality**:
    - Hệ thống Audit & Operational Health Check (Issue #26).
    - Premium Polish & Dark Mode (Issue #24).
- [ ] **Emergency & Maintenance**:
    - Emergency Stable Environment Debugging & Recovery (Issue #29).
    - Full Project Backup & GitHub Checkpoint (Issue #30).
    - Disaster Recovery & Restore Guide (Issue #31).

---

## 🚀 Phase 4: Scaling & High Performance (Next Steps)
Mục tiêu: Chuyển đổi công nghệ để chịu tải lớn và đa nền tảng.

- [ ] **Data Migration**: Chuyển đổi từ JSON file sang **PostgreSQL**.
- [ ] **Architecture Refactor**: Chuyển đổi sang **Next.js 15** (App Router) để tối ưu SEO và tốc độ.
- [ ] **Mobile App App (Beta)**: Triển khai bản **Expo** cho kỹ thuật viên với tính năng Offline.
- [ ] **Smart Maintenance**: Dự báo hỏng hóc (Predictive Maintenance) dựa trên AI/Machine Learning.

---

## 🛡️ AI Governance & Workflow Rules
**Quy tắc khống chế vòng lặp và tự động hóa:**
1. **Task Generation**: Claude Code KHÔNG ĐƯỢC PHÉP tự động tạo file `.txt` trong `tasks_queue` vượt quá 3 issue mỗi lần.
2. **Approval Required**: Mọi task tự tạo phải được liệt kê trong `brain/tasks_proposal` để Admin duyệt trước khi thực thi.
3. **Queue Limit**: Hàng đợi thực thi tối đa là **5 Task**. Nếu vượt quá, các task mới sẽ bị tạm dừng (Paused).
4. **Execution Safeguard**: Mỗi Task giới hạn tối đa **15 phút**. Quá thời gian hệ thống sẽ tự ngắt để bảo vệ tài nguyên.
