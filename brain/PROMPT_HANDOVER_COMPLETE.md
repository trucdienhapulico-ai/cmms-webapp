# CMMS WebApp — Project Briefing & AI Handover Document
**Phiên bản:** 1.0 | **Ngày tạo:** 2026-05-06 | **Tác giả:** Claude Code (AI Audit)

> **Mục đích của tài liệu này:** Đây là bản "Project Briefing" toàn diện được thiết kế để nạp vào bất kỳ AI assistant nào (Claude, GPT, Gemini, Copilot…) và giúp nó hiểu ngay lập tức toàn bộ dự án, lịch sử phát triển, và tiếp tục lập trình mà không cần đọc lại hàng chục ngàn dòng mã nguồn.

---

## 1. TỔNG QUAN DỰ ÁN

| Mục | Thông tin |
|-----|-----------|
| **Tên sản phẩm** | CMMS – Hệ thống Quản lý Bảo trì Cơ điện (M&E) |
| **Loại ứng dụng** | Web app nội bộ (Single Page Application) |
| **Mục tiêu** | Quản lý bảo trì hệ thống cơ điện cho tòa nhà/sân golf |
| **Phiên bản hiện tại** | v1.3.5 |
| **Stack** | Node.js + Express (backend), Vanilla HTML/CSS/JS (frontend), JSON file DB |
| **Port dev** | http://localhost:3090 |
| **Repo GitHub** | https://github.com/trucdienhapulico-ai/cmms-webapp |
| **Branch chính** | master |
| **Deployment** | Docker Compose trên Synology NAS |
| **Môi trường** | Test (port 8081) + Stable/Production (port 8080) |

**Trạng thái hiện tại:** Phase 1, 2, 3 đã hoàn thành. Phase 4 (PostgreSQL migration, Next.js, Mobile App) đang trong kế hoạch.

---

## 2. KIẾN TRÚC HỆ THỐNG

### 2.1 Cấu trúc thư mục
```
cmms-webapp/
├── server.js               # Express server + toàn bộ API routes (~1454 dòng)
├── public/
│   ├── index.html          # Main SPA shell + toàn bộ frontend logic (~3308 dòng)
│   └── tenant.html         # Trang báo cáo sự cố cho tenant (public, không cần auth)
├── data/
│   └── db.json             # JSON file database (tất cả dữ liệu)
├── brain/
│   ├── roadmap.md          # Kế hoạch phát triển theo Phase
│   ├── task.md             # Issues đang chờ xử lý
│   ├── health_report.md    # Báo cáo audit hệ thống (2026-05-04)
│   ├── tasks_done/         # Archive 21 issues đã hoàn thành
│   ├── tasks_proposal/     # Đề xuất tính năng chờ duyệt
│   └── PROMPT_HANDOVER_COMPLETE.md  # File này
├── deploy/
│   ├── docker-compose.yml  # Cấu hình 2 môi trường (stable + test)
│   ├── nginx/              # Reverse proxy config
│   └── scripts/            # Deployment automation scripts
├── package.json            # Dependencies
└── CLAUDE.md               # Hướng dẫn cho AI agents
```

### 2.2 Kiến trúc backend (server.js)

Monolithic Express server — toàn bộ logic nằm trong 1 file `server.js`:

```
Middleware stack:
  trust proxy → HTTPS redirect → Security headers → Rate limiting
  → JSON parser → cookieParser → static files
  → requireAuth (per-route) → route handlers → saveDB
```

**Cơ chế DB:**
- `loadDB()` — đọc `db.json`, cache in-memory với mtime tracking
- `saveDB(db)` — ghi trực tiếp file (CHƯA atomic, đây là rủi ro đã biết)
- Schema migration tự động khi thêm collection mới
- Auto-rotate: checklists≤500, maintenanceLogs≤1000, inventoryTx≤2000, notifications≤200, auditLogs≤5000

### 2.3 Kiến trúc frontend (public/index.html)

SPA thuần vanilla JS, không framework:

```
index.html
├── CSS variables (dark mode, colors, spacing)
├── HTML shell (sidebar nav, main content area, mobile bottom nav)
└── JavaScript
    ├── State: currentPage, currentUser, darkMode
    ├── Router: navigate(page) → renders[page]()
    ├── API helper: api(method, path, body) → JSON response
    ├── Toast system: toast(message, type)
    ├── Modal system: showModal(title, body, actions)
    └── Page renderers (1 function per module):
        renderDashboard(), renderWorkOrders(), renderAssets(),
        renderChecklist(), renderPM(), renderInventory(),
        renderVendors(), renderPO(), renderShifts(),
        renderTenantRequests(), renderNotifications(),
        renderAuditLogs(), renderUsers(), renderScan(),
        renderIntegration(), renderSystemInfo()
```

---

## 3. XÁC THỰC & BẢO MẬT

### 3.1 Authentication
- **Loại:** Cookie-based session (không dùng JWT)
- **Session storage:** In-memory `Map` — `sessions.set(token, {userId, username, role, lastSeen})`
- **Token:** 32-byte random hex (`crypto.randomBytes(32).toString('hex')`)
- **Cookie:** `cmms-sid`, `httpOnly: true`, `sameSite: 'strict'`, `maxAge: 8h`
- **Cookie secure flag:** `secure: IS_PROD && isHttps` (chỉ bật khi thực sự qua HTTPS)
- **Password hashing:** PBKDF2-SHA256, 100.000 iterations, 64-byte hash, 32-byte salt

### 3.2 Authorization (middleware)
```javascript
// Dùng trong mọi protected route:
requireAuth(roles = [])
// req.session = { userId, username, role, lastSeen }
// roles [] → chỉ cần login, không check role
// roles ['admin'] → chỉ admin mới vào được
```

**4 Roles và quyền hạn:**
| Role | Xem | Tạo WO | Sửa Assets | Quản lý Users | System Config |
|------|-----|---------|------------|---------------|---------------|
| **admin** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **manager** | ✅ | ✅ | ✅ | ❌ | ❌ |
| **operator** | ✅ | ✅ (hạn chế) | ❌ | ❌ | ❌ |
| **viewer** | ✅ | ❌ | ❌ | ❌ | ❌ |

### 3.3 Security Headers
```
Strict-Transport-Security: max-age=3600
X-Content-Type-Options: nosniff
X-Frame-Options: SAMEORIGIN
Referrer-Policy: strict-origin-when-cross-origin
```

### 3.4 Rate Limiting
- Global API: 200 req / 15 phút / IP
- Login endpoint: 10 attempts / 15 phút / IP

### 3.5 Lỗ hổng bảo mật đã biết (cần xử lý)
- ⚠️ **XSS:** WO titles và descriptions được insert trực tiếp vào `innerHTML` — cần sanitize trước go-live
- ⚠️ **db.json write:** Ghi trực tiếp (không atomic) — nếu server crash giữa chừng, file có thể bị corrupt
- ✅ **Đã fix:** Plaintext password trong localStorage (Issue #26)
- ✅ **Đã fix:** `req.user` crash trong promote endpoint (Issue #26)

---

## 4. DATABASE SCHEMA (db.json)

Tất cả collections trong một JSON object. Đây là schema đầy đủ:

### `users[]`
```json
{
  "id": "u1", "username": "admin", "passwordHash": "...", "salt": "...",
  "name": "Administrator", "role": "admin", "createdAt": "ISO8601"
}
```

### `assets[]`
```json
{
  "id": "A0001", "name": "Máy bơm nước B1", "code": "PUMP-B1-01",
  "category": "Cơ khí", "location": "Tầng hầm B1", "type": "equipment",
  "parentId": "A0010",
  "manufacturer": "Grundfos", "model": "CR 32", "serialNumber": "SN-12345",
  "installDate": "2023-01-15", "status": "active",
  "notes": "...", "createdAt": "...", "updatedAt": "..."
}
```
- Auto-increment ID: A0001, A0002...
- Hỗ trợ cây phân cấp qua `parentId` (Building → System → Equipment)
- `status`: `active`, `inactive`, `maintenance`

### `workOrders[]`
```json
{
  "id": "WO-0001", "title": "...", "description": "...",
  "assetId": "A0001", "priority": "high", "assignedTo": "userId",
  "dueDate": "2026-05-10", "type": "corrective", "status": "open",
  "createdBy": "userId", "source": "manual",
  "pmScheduleId": null, "tenantRequestId": null,
  "history": [
    {"status": "open", "comment": "...", "by": "userId", "at": "ISO8601"}
  ],
  "createdAt": "...", "updatedAt": "..."
}
```
- ID: WO-0001, WO-0002...
- `type`: `corrective`, `preventive`, `emergency`
- `status`: `open` → `in-progress` → `done` / `cancelled`
- `priority`: `high`, `medium`, `low`
- `source`: `manual`, `pm`, `tenant`

### `checklistTemplates[]`
```json
{
  "id": "ct1", "name": "Kiểm tra máy bơm", "category": "Cơ khí",
  "items": [
    {"id": "i1", "label": "Áp suất đầu vào", "type": "number", "unit": "bar"},
    {"id": "i2", "label": "Trạng thái motor", "type": "status"}
  ],
  "createdBy": "userId", "createdAt": "...", "updatedAt": "..."
}
```
- Item `type`: `status` (ok/caution/fail), `number` (số đo + đơn vị), `text` (ghi chú tự do)

### `checklists[]` (capped 500)
```json
{
  "id": "cl1", "templateId": "ct1", "assetId": "A0001",
  "shiftType": "morning", "date": "2026-05-06",
  "results": [{"itemId": "i1", "value": "2.5"}, {"itemId": "i2", "value": "ok"}],
  "savedBy": "userId", "timestamp": "ISO8601"
}
```

### `maintenanceLogs[]` (capped 1000)
```json
{
  "id": "ml1", "assetId": "A0001", "templateId": "ct1",
  "date": "2026-05-06",
  "results": [{"itemId": "...", "value": "..."}],
  "notes": "...", "submittedBy": "name", "submittedById": "userId", "createdAt": "..."
}
```

### `pmSchedules[]`
```json
{
  "id": "pm1", "name": "PM Tháng - Máy bơm B1", "assetId": "A0001",
  "templateId": "ct1", "frequency": "monthly",
  "startDate": "2026-05-01", "endDate": null,
  "assignedTo": "userId", "priority": "medium",
  "status": "active",
  "nextDueDate": "2026-06-01", "lastGeneratedDate": null, "generatedCount": 0,
  "createdBy": "userId", "createdAt": "...", "updatedAt": "..."
}
```
- `frequency`: `daily`, `weekly`, `monthly`, `quarterly`, `yearly`
- Auto-generate WO khi ngày đến hạn (qua `POST /api/pm-schedules/run-due`)

### `inventory[]`
```json
{
  "id": "inv1", "name": "Vòng bi SKF 6205", "sku": "SKF-6205",
  "unit": "cái", "qty": 10, "minQty": 3,
  "location": "Kho A, Kệ 2", "notes": "...",
  "createdBy": "userId", "createdAt": "...", "updatedAt": "..."
}
```

### `inventoryTx[]` (capped 2000)
```json
{
  "id": "tx1", "itemId": "inv1", "itemName": "Vòng bi SKF 6205",
  "type": "out", "qty": 2, "delta": -2, "balanceAfter": 8,
  "note": "Thay cho WO-0005", "workOrderId": "WO-0005",
  "by": "userId", "createdAt": "..."
}
```

### `vendors[]`
```json
{
  "id": "v1", "name": "Công ty ABC", "contact": "Nguyễn Văn A",
  "phone": "0901234567", "email": "abc@email.com",
  "address": "123 Đường XYZ", "notes": "...",
  "createdBy": "userId", "createdAt": "...", "updatedAt": "..."
}
```

### `purchaseOrders[]`
```json
{
  "id": "po1", "vendorId": "v1", "vendorName": "Công ty ABC",
  "items": [{"name": "Vòng bi", "qty": 10, "unit": "cái", "unitPrice": 50000}],
  "totalAmount": 500000, "status": "draft",
  "expectedDate": "2026-05-20", "notes": "...",
  "createdBy": "userId", "receivedAt": null, "receivedBy": null,
  "createdAt": "...", "updatedAt": "..."
}
```
- `status`: `draft` → `sent` → `received` → `cancelled`
- Khi chuyển sang `received` → tự động cộng vào inventory

### `tenantRequests[]`
```json
{
  "id": "tr1", "token": "random-8chars",
  "name": "Nguyễn Văn B", "phone": "0912345678", "unit": "Tầng 5 - P501",
  "category": "Điện", "urgency": "high",
  "description": "Mất điện phòng 501",
  "status": "pending", "workOrderId": null,
  "createdAt": "...", "updatedAt": "..."
}
```
- `status`: `pending` → `approved` / `rejected`
- Approve tự động tạo WO nội bộ

### `notifications[]` (capped 200)
```json
{
  "id": "n1", "type": "low_stock",
  "title": "Cảnh báo tồn kho thấp",
  "body": "Vòng bi SKF 6205: còn 2, ngưỡng tối thiểu 3",
  "read": false, "refId": "inv1", "refType": "inventory",
  "createdAt": "..."
}
```
- `type`: `low_stock`, `overdue_wo`, `tenant_request`

### `shifts[]`
```json
{
  "id": "sh1", "userId": "u2", "userName": "Trần Văn C",
  "date": "2026-05-06", "shiftType": "morning",
  "startTime": "06:00", "endTime": "14:00",
  "status": "scheduled", "notes": "...",
  "checkInAt": null, "checkOutAt": null,
  "createdBy": "userId", "createdAt": "..."
}
```
- `shiftType`: `morning` (06-14), `afternoon` (14-22), `night` (22-06)
- `status`: `scheduled` → `checked-in` → `checked-out`

### `auditLogs[]` (capped 5000)
```json
{
  "id": "al1", "action": "login",
  "entity": "user", "entityId": "u1",
  "userId": "u1", "userName": "admin",
  "details": {"note": "..."},
  "ip": "192.168.1.1", "createdAt": "..."
}
```
- `action`: `create`, `update`, `delete`, `login`, `logout`, `reset_password`, `export`, `promote`, `check_in`, `check_out`

### `apiKeys[]`
```json
{"id": "ak1", "label": "BMS Integration", "key": "cmms_ak_...", "active": true, "createdAt": "..."}
```

### `webhooks[]`
```json
{"id": "wh1", "label": "Zapier", "url": "https://...", "events": ["work_order.created"], "active": true, "createdAt": "..."}
```

---

## 5. API ENDPOINTS ĐẦY ĐỦ

**Format response:** `{ok: 1, data: ...}` hoặc `{ok: 0, error: "..."}`

### Authentication
| Method | Path | Auth | Mô tả |
|--------|------|------|-------|
| POST | `/api/login` | ❌ (rate-limited 10/15min) | Đăng nhập, set cookie `cmms-sid` |
| POST | `/api/logout` | ✅ | Đăng xuất, xóa session |
| GET | `/api/me` | ✅ | Thông tin user hiện tại |
| POST | `/api/me/change-password` | ✅ | Đổi mật khẩu (currentPassword, newPassword) |
| POST | `/api/users/:id/reset-password` | admin | Đặt lại mật khẩu (newPassword) |

### Users
| Method | Path | Auth | Mô tả |
|--------|------|------|-------|
| GET | `/api/users` | admin | Danh sách users |
| POST | `/api/users` | admin | Tạo user (username, password, name, role) |
| DELETE | `/api/users/:id` | admin | Xóa user |

### Assets
| Method | Path | Auth | Mô tả |
|--------|------|------|-------|
| GET | `/api/assets` | ✅ | Danh sách (`?q=`, `?location=`, `?status=`, `?category=`) |
| GET | `/api/assets/categories` | ✅ | Danh sách categories duy nhất |
| GET | `/api/assets/:id` | ✅ | Chi tiết asset |
| POST | `/api/assets` | admin,manager | Tạo asset |
| PUT | `/api/assets/:id` | admin,manager | Cập nhật asset |
| DELETE | `/api/assets/:id` | admin | Xóa asset |
| GET | `/api/assets/:id/qr` | ✅ | Trả SVG QR code PNG |

### Work Orders
| Method | Path | Auth | Mô tả |
|--------|------|------|-------|
| GET | `/api/work-orders` | ✅ | Danh sách (`?status=`, `?priority=`, `?assignedTo=`, `?assetId=`, `?q=`) |
| GET | `/api/work-orders/:id` | ✅ | Chi tiết |
| POST | `/api/work-orders` | ✅ | Tạo WO |
| PUT | `/api/work-orders/:id` | ✅ | Cập nhật (status, priority, assignedTo, dueDate, v.v.) |
| POST | `/api/work-orders/:id/comment` | ✅ | Thêm comment vào history |
| DELETE | `/api/work-orders/:id` | admin | Xóa WO |
| GET | `/api/stats` | ✅ | Dashboard stats + KPI (MTTR, MTBF, PM Compliance, Overdue Rate) |

### Checklists & Templates
| Method | Path | Auth | Mô tả |
|--------|------|------|-------|
| GET | `/api/checklists` | ✅ | Danh sách (`?shift=`, `?date=`, `?limit=`) |
| GET | `/api/checklists/:id` | ✅ | Chi tiết |
| POST | `/api/checklists` | ✅ | Lưu checklist |
| GET | `/api/checklist-templates` | ✅ | Danh sách templates (`?category=`) |
| POST | `/api/checklist-templates` | admin,manager | Tạo template |
| PUT | `/api/checklist-templates/:id` | admin,manager | Cập nhật template |
| DELETE | `/api/checklist-templates/:id` | admin | Xóa template |

### Maintenance Logs
| Method | Path | Auth | Mô tả |
|--------|------|------|-------|
| GET | `/api/maintenance-logs` | ✅ | Danh sách (`?assetId=`, `?limit=`) |
| POST | `/api/maintenance-logs` | ✅ | Tạo log |

### PM Schedules
| Method | Path | Auth | Mô tả |
|--------|------|------|-------|
| GET | `/api/pm-schedules` | ✅ | Danh sách (`?status=`, `?assetId=`) |
| POST | `/api/pm-schedules` | admin,manager | Tạo lịch PM |
| PUT | `/api/pm-schedules/:id` | admin,manager | Cập nhật |
| DELETE | `/api/pm-schedules/:id` | admin | Xóa |
| POST | `/api/pm-schedules/run-due` | admin,manager | Chạy auto-generate WO cho các PM đến hạn |
| POST | `/api/pm-schedules/:id/generate-wo` | admin,manager | Tạo WO thủ công từ PM schedule |

### Inventory & Transactions
| Method | Path | Auth | Mô tả |
|--------|------|------|-------|
| GET | `/api/inventory` | ✅ | Danh sách (`?search=`, `?lowStock=true`) |
| POST | `/api/inventory` | admin,manager | Tạo item mới |
| PUT | `/api/inventory/:id` | admin,manager | Cập nhật thông tin item |
| DELETE | `/api/inventory/:id` | admin | Xóa item |
| GET | `/api/inventory/:id/transactions` | ✅ | Lịch sử giao dịch (50 gần nhất) |
| POST | `/api/inventory/:id/transaction` | ✅ | Nhập/xuất kho (`{type: "in"/"out", qty, note, workOrderId}`) |

### Vendors & Purchase Orders
| Method | Path | Auth | Mô tả |
|--------|------|------|-------|
| GET | `/api/vendors` | ✅ | Danh sách vendors |
| POST | `/api/vendors` | admin,manager | Tạo vendor |
| PUT | `/api/vendors/:id` | admin,manager | Cập nhật |
| DELETE | `/api/vendors/:id` | admin | Xóa |
| GET | `/api/purchase-orders` | ✅ | Danh sách POs (`?status=`) |
| POST | `/api/purchase-orders` | admin,manager | Tạo PO |
| PUT | `/api/purchase-orders/:id/status` | admin,manager | Cập nhật status PO |

### Tenant Portal (PUBLIC)
| Method | Path | Auth | Mô tả |
|--------|------|------|-------|
| GET | `/tenant` | ❌ | Trang form báo cáo sự cố (tenant.html) |
| POST | `/api/tenant-requests` | ❌ | Gửi yêu cầu, trả về `{token}` |
| GET | `/api/tenant-requests/track/:token` | ❌ | Tenant tra cứu trạng thái |
| GET | `/api/tenant-requests` | admin,manager | Danh sách requests |
| PUT | `/api/tenant-requests/:id/approve` | admin,manager | Duyệt + tạo WO nội bộ |
| PUT | `/api/tenant-requests/:id/reject` | admin,manager | Từ chối |

### Notifications
| Method | Path | Auth | Mô tả |
|--------|------|------|-------|
| GET | `/api/notifications` | admin,manager | Danh sách thông báo chưa đọc |
| POST | `/api/notifications/mark-read` | admin,manager | Đánh dấu tất cả đã đọc |

### Shifts / HR
| Method | Path | Auth | Mô tả |
|--------|------|------|-------|
| GET | `/api/shifts` | ✅ | Danh sách (`?from=`, `?to=`, `?userId=`) |
| GET | `/api/shifts/workload` | ✅ | Báo cáo workload theo user/tháng |
| POST | `/api/shifts` | admin,manager | Tạo ca làm việc |
| PUT | `/api/shifts/:id` | admin,manager | Cập nhật |
| DELETE | `/api/shifts/:id` | admin | Xóa |
| POST | `/api/shifts/:id/check-in` | ✅ | Chấm công vào |
| POST | `/api/shifts/:id/check-out` | ✅ | Chấm công ra |

### Audit & System
| Method | Path | Auth | Mô tả |
|--------|------|------|-------|
| GET | `/api/audit-logs` | admin | Lịch sử audit (`?entity=`, `?action=`, `?userId=`, `?limit=`) |
| GET | `/api/export/db` | admin | Export toàn bộ db.json |
| POST | `/api/backup` | admin | Tạo backup thủ công |
| GET | `/api/system/info` | ✅ | Thông tin hệ thống (version, uptime, env) |
| GET | `/api/system/tasks` | admin | Trạng thái task queue |
| POST | `/api/system/promote` | admin (test env only) | Promote Test → Stable |
| GET | `/api/health` | ❌ | Health check endpoint |

### Integration (BMS/IoT)
| Method | Path | Auth | Mô tả |
|--------|------|------|-------|
| GET | `/api/integration/api-keys` | admin | Danh sách API keys |
| POST | `/api/integration/api-keys` | admin | Tạo API key |
| DELETE | `/api/integration/api-keys/:id` | admin | Thu hồi API key |
| GET | `/api/integration/webhooks` | admin | Danh sách webhooks |
| POST | `/api/integration/webhooks` | admin | Đăng ký webhook |
| DELETE | `/api/integration/webhooks/:id` | admin | Xóa webhook |
| POST | `/api/external/alert` | API Key header | Nhận cảnh báo từ BMS/IoT bên ngoài |

---

## 6. FRONTEND MODULES (index.html)

### 6.1 Routing & State
```javascript
// Global state
let currentPage = '';
let currentUser = null;  // { id, username, name, role }

// Router
function navigate(page) {
  currentPage = page;
  renders[page]();
}

// Renders map
const renders = {
  dashboard: renderDashboard,
  workorders: renderWorkOrders,
  assets: renderAssets,
  checklist: renderChecklist,
  pm: renderPM,
  inventory: renderInventory,
  vendors: renderVendors,
  po: renderPO,
  shifts: renderShifts,
  tenant: renderTenantRequests,
  notifications: renderNotifications,
  audit: renderAuditLogs,
  users: renderUsers,
  scan: renderScan,
  integration: renderIntegration,
  system: renderSystemInfo
};
```

### 6.2 API Helper
```javascript
async function api(method, path, body = null) {
  const res = await fetch(path, {
    method,
    headers: body ? {'Content-Type': 'application/json'} : {},
    body: body ? JSON.stringify(body) : null
  });
  return res.json();  // Luôn trả {ok, data} hoặc {ok, error}
}
```

### 6.3 UI Components
```javascript
// Toast notification
toast('Thông báo thành công!', 'success'); // 'success', 'error', 'warning'

// Modal
showModal('Tiêu đề', '<p>Nội dung HTML</p>', [
  {label: 'Hủy', class: 'btn-secondary', action: closeModal},
  {label: 'Xác nhận', class: 'btn-primary', action: doSomething}
]);

// Close modal
closeModal();
```

### 6.4 Các trang chính

**Dashboard:** Hiển thị KPI cards (Total Assets, Open WOs, High Priority, Overdue), KPI metrics (MTTR, MTBF, PM Compliance %, Overdue Rate %), biểu đồ 6 tháng gần nhất.

**Work Orders:** List view với filter. Click → modal chi tiết + history. Form tạo mới inline. Status workflow: open → in-progress → done/cancelled.

**Assets:** Tree view phân cấp (Building → System → Equipment). Filter theo category/location/status. QR code generation per asset.

**Checklist:** Chọn template → điền từng item → lưu. Item type: status (ok/caution/fail buttons), number (input + unit), text (textarea).

**PM Scheduling:** Calendar month view + list view. Tạo schedule mới. Xem badges trên calendar: 🟢 upcoming, 🔴 overdue, 🔵 today.

**Inventory:** List với highlight đỏ khi qty ≤ minQty. Nhập/xuất kho → tự động tạo transaction.

**Vendor & PO:** Vendor CRUD → Tạo PO gán vendor + line items → Đổi status → Khi "received" tự cộng inventory.

**Tenant Requests:** Table requests. Nút "Duyệt" → tạo WO nội bộ. Nút "Từ chối" → cập nhật status.

**Shifts/HR:** Calendar view tuần. Check-in/check-out. Workload report theo tháng.

**QR Scanner:** Dùng html5-qrcode. Scan → nhận assetId → navigate đến asset detail hoặc mở checklist form.

### 6.5 Responsive & Dark Mode
- Sidebar ẩn trên mobile, thay bằng bottom navigation (6 icons)
- Breakpoint: `@media (max-width: 768px)`
- Dark mode: toggle button ở header, persist vào `localStorage['cmms-theme']`
- CSS variables: `--bg`, `--bg2`, `--text`, `--border`, `--primary`, v.v.

---

## 7. DEPLOYMENT

### 7.1 Docker Compose (2 môi trường)
```yaml
# deploy/docker-compose.yml
services:
  cmms-stable:  # Production (port 8080)
    environment: NODE_ENV=production
    volumes: cmms-stable-data:/app/data
    healthcheck: GET /api/health mỗi 30s

  cmms-test:    # Staging (port 8081)
    environment: NODE_ENV=test
    volumes: cmms-test-data:/app/data
    volumes: /var/run/docker.sock  # Cho phép self-deploy

  nginx:        # Reverse proxy
    ports: [80, 443]
    routes: /stable → 8080, /test → 8081
```

### 7.2 Quy trình deploy
1. Push code lên GitHub master
2. SSH vào NAS Synology
3. `git pull origin master`
4. `docker compose up -d --build --no-deps --force-recreate cmms-test`
5. Test trên http://nas-ip:8081
6. Từ TEST admin panel → "Kích hoạt phát hành" → `POST /api/system/promote`
7. Docker rebuild STABLE container từ latest code

### 7.3 Recovery khi db.json bị corrupt
```bash
docker exec cmms-stable cp /app/data/db.json /app/data/db.json.corrupted
docker exec cmms-stable rm /app/data/db.json
docker restart cmms-stable  # loadDB() sẽ auto-reinitialize
```

### 7.4 Nginx config yêu cầu
- Phải có `proxy_set_header X-Forwarded-Proto $scheme` để HTTPS redirect hoạt động đúng
- Thiếu header này → app blind về connection type → redirect loop hoặc session cookie fail

---

## 8. ĐÁNH GIÁ TOÀN DIỆN (Audit 2026-05-06)

### 8.1 Kiến trúc — 7/10
**Điểm mạnh:**
- Monolithic single-file rất dễ navigate và debug cho team nhỏ
- JSON DB đơn giản, không cần setup phức tạp
- In-memory cache với mtime tracking giúp giảm disk I/O
- Schema migration tự động khi thêm collection

**Điểm yếu:**
- `server.js` (~1454 dòng) và `index.html` (~3308 dòng) quá lớn, khó maintain khi scale
- JSON file DB không hỗ trợ concurrent writes (race condition nếu nhiều request cùng lúc)
- `saveDB()` không atomic — crash giữa write → corrupt db.json
- Không có unit tests, integration tests
- Không có API documentation (OpenAPI/Swagger)

### 8.2 Bảo mật — 7.5/10
**Điểm mạnh:**
- PBKDF2-SHA256 với 100k iterations — rất mạnh
- Cookie httpOnly + sameSite strict
- Rate limiting đầy đủ (global + login-specific)
- Audit log toàn diện
- HTTPS redirect + security headers

**Điểm yếu (cần xử lý trước go-live):**
- ⚠️ **XSS Risk:** `innerHTML` với user data (WO titles, descriptions, notes) — cần sanitize
- ⚠️ **No CSRF protection** — `sameSite: strict` giảm thiểu nhưng chưa đủ cho production
- ⚠️ **Sessions in-memory** — restart server → mất tất cả sessions, users bị logout
- ℹ️ Admin password đã được đổi (không còn dùng `admin123`)

### 8.3 Hiệu năng — 6.5/10
**Điểm mạnh:**
- In-memory DB cache với mtime tracking hiệu quả
- Batch save thay vì save sau mỗi thao tác nhỏ
- Collections auto-rotate để giữ DB size nhỏ

**Điểm yếu:**
- Toàn bộ db.json được load vào RAM mỗi request (khi cache miss)
- Không có pagination cho hầu hết API endpoints
- Không có index/query optimization (JSON.filter() là O(n) trên mọi collection)
- `saveDB()` là synchronous write — block event loop khi file lớn
- Không có CDN, asset bundling, hay gzip ngoài những gì Nginx cung cấp

### 8.4 UI/UX — 8/10
**Điểm mạnh:**
- Responsive design đầy đủ — desktop sidebar + mobile bottom nav
- Dark mode với CSS variables
- Toast notifications + modal system nhất quán
- QR code scanner tích hợp sẵn
- Calendar view cho PM và shifts

**Điểm yếu:**
- Không có loading skeleton (chỉ có loading spinner text)
- Không có optimistic UI updates — mọi action phải đợi server response
- Form validation chỉ có client-side cho một số field, server-side cho số khác
- Không có error boundary — nếu 1 render function crash, cả trang trắng

---

## 9. ROADMAP TIẾP THEO

### Phase 4 (Chưa bắt đầu)
| Mục tiêu | Chi tiết | Độ ưu tiên |
|----------|----------|------------|
| **PostgreSQL Migration** | Thay JSON file bằng PostgreSQL để ACID compliance, concurrent writes, scalability | 🔴 Cao |
| **Next.js 15 Refactor** | App Router, SSR, tách frontend/backend, module hóa | 🟡 Trung |
| **Mobile App (Expo)** | React Native cho kỹ thuật viên hiện trường, offline support | 🟡 Trung |
| **Predictive Maintenance** | ML/AI để dự báo hỏng hóc dựa trên lịch sử | 🟢 Thấp |

### Việc cần làm ngay (Pre Go-Live)
1. **Sanitize XSS** — Thêm DOMPurify hoặc manual escaping cho innerHTML với user data
2. **Atomic DB writes** — Write to temp file → rename (xử lý corrupt risk)
3. **Populate Inventory** — Module inventory hiện còn 0 items
4. **Resolve WO-0001** — Work order bơm nước B1 đã quá hạn từ 2026-05-03
5. **Pagination** — Thêm `?page=&limit=` cho các endpoints lớn
6. **Error boundaries** — Bọc render functions trong try/catch

---

## 10. TÀI KHOẢN MẶC ĐỊNH (Dev)

> ⚠️ **CẢNH BÁO:** Đổi tất cả mật khẩu trước khi deploy production!

| Username | Password | Role |
|----------|----------|------|
| admin | admin | admin |

*Password production đã được thay đổi (xem health_report.md)*

---

## 11. LỆNH THƯỜNG DÙNG

```bash
# Chạy dev server
node server.js

# Test health
curl http://localhost:3090/api/health

# Test login
curl -X POST http://localhost:3090/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin"}'

# Push code
git add -A && git commit -m "..." && git push origin master

# Xem GitHub issues chờ xử lý
gh issue list --label claude-todo --repo trucdienhapulico-ai/cmms-webapp

# Deploy test environment (trên NAS)
docker compose -f deploy/docker-compose.yml up -d --build --no-deps --force-recreate cmms-test

# Deploy stable (sau khi test xong)
docker compose -f deploy/docker-compose.yml up -d --build --no-deps --force-recreate cmms-stable
```

---

## 12. QUY TẮC CHO AI TIẾP THEO

1. **Không tự tạo issues quá 3 cái mỗi lần** — Tuân thủ AI Governance Rules trong `brain/roadmap.md`
2. **Mọi task proposal mới** → ghi vào `brain/tasks_proposal/` để Admin duyệt trước
3. **Khi sửa server.js** → Luôn verify logic `requireAuth()` không bị bypass
4. **Khi thêm collection mới vào DB** → Thêm vào `defaults` object trong `loadDB()` để auto-migrate
5. **Khi sửa frontend** → Test cả desktop và mobile view (768px breakpoint)
6. **Commit message format:** `Feature: [tên-tính-năng] - mô tả ngắn` hoặc `Fix: [tên-lỗi]`
7. **Không xóa audit log entries** — Chỉ rotate khi vượt cap (5000 records)
8. **XSS safety** — Khi render user data vào HTML, dùng `textContent` thay vì `innerHTML`, hoặc escape trước

---

## 13. FILES QUAN TRỌNG — VỊ TRÍ THAM CHIẾU NHANH

| Muốn biết | Xem file | Dòng ước tính |
|-----------|----------|---------------|
| Toàn bộ API routes | `server.js` | Toàn bộ file |
| DB Schema & loadDB | `server.js` | 1-200 |
| Auth middleware `requireAuth` | `server.js` | ~100-150 |
| Password hash logic | `server.js` | ~150-200 |
| Audit log helper `addAuditLog()` | `server.js` | ~200-250 |
| Stats/KPI calculation | `server.js` | Tìm `/api/stats` |
| PM auto-generate logic | `server.js` | Tìm `run-due` |
| SPA router | `public/index.html` | ~650-750 |
| Dashboard render | `public/index.html` | Tìm `renderDashboard` |
| Work order render | `public/index.html` | Tìm `renderWorkOrders` |
| CSS variables + dark mode | `public/index.html` | ~1-200 |
| Mobile responsive CSS | `public/index.html` | Tìm `@media` |
| Tenant form | `public/tenant.html` | Toàn bộ (183 dòng) |
| Docker setup | `deploy/docker-compose.yml` | Toàn bộ |
| Nginx config | `deploy/nginx/` | |
| Roadmap | `brain/roadmap.md` | |
| Completed issues | `brain/tasks_done/` | |
