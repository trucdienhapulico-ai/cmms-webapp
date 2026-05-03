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
- [ ] **UI Map Maintenance (Issue #18)**: Rà soát & bổ sung đầy đủ mã định vị cho tất cả khu vực giao diện.

## Phase 3: Analytics & Advanced Features (Target: Month 4+)
Mục tiêu: Tối ưu hóa hiệu suất qua dữ liệu và mở rộng tính năng quản lý.

- [x] **Advanced Dashboard & Analytics**:
    - KPI: MTTR, MTBF, PM Compliance rate (Tab 3.7.1).
    - Biểu đồ xu hướng sự cố và chi phí bảo trì.
- [ ] **HR & Scheduling**:
    - Quản lý lịch trực ca, workload của kỹ thuật viên (Tab 4.15).
    - Theo dõi giờ công thực tế qua Check-in/out GPS.
- [ ] **Advanced Inventory**:
    - Purchase Orders (PO) và quy trình phê duyệt mua hàng (Tab 4.16).
    - Quản lý nhà cung cấp (Vendor) và đánh giá chất lượng.
- [ ] **System Integration**:
    - Webhooks/API cho tích hợp BMS/IoT tương lai.
    - Backup tự động và Audit log hệ thống.

---

## 🛠️ Technical Strategy (Based on Research)
- **Frontend**: Chuyển đổi sang Next.js 15 + shadcn/ui để tăng tốc độ phát triển UI chuyên nghiệp.
- **Backend**: Duy trì Node.js (Fastify/Express) nhưng nâng cấp từ JSON file DB sang **PostgreSQL** (bắt buộc cho dữ liệu quan hệ phức tạp).
- **Mobile**: Sử dụng **Expo (React Native)** để dùng chung logic TypeScript và hỗ trợ QR Scanner/Offline mode.
- **Infrastructure**: Triển khai qua **Docker Compose** (đang thực hiện ở Issue #5) để đảm bảo môi trường Test và Stable tách biệt.
