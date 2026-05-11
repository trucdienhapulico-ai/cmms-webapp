# Kiến trúc Second Brain: Obsidian + Synology NAS

Dựa trên yêu cầu của bạn về một "Second Brain" cá nhân, tuyệt đối bảo mật, không public, và phục vụ trực tiếp cho công việc (quản lý dự án CMMS, bảo trì cơ điện, quy chuẩn), đây là bản thiết kế hệ thống tối ưu nhất sử dụng Synology NAS và mạng Tailscale hiện có của bạn.

---

## 1. Kiến trúc Đồng bộ & Bảo mật (Core Architecture)

Để đảm bảo **không ai ngoài bạn có thể truy cập**, chúng ta sẽ loại bỏ hoàn toàn việc public qua Internet (không dùng QuickConnect public, không NAT port 80/443 ra ngoài cho Vault).

### A. Lớp Mạng (Network Layer)
- **Tailscale (VPN riêng):** Sử dụng IP Tailscale `100.99.71.11` (hostname: `onecloud`) mà bạn đang có. 
- Mọi kết nối từ Laptop/Điện thoại về NAS đều phải đi qua Tailscale. Dữ liệu được mã hóa End-to-End (E2EE) và không lộ diện trên Internet.

### B. Cơ chế Đồng bộ (Sync Mechanism)
Có 2 phương án tùy thuộc vào thiết bị bạn dùng:

1. **Phương án 1: Dùng Synology Drive (Khuyên dùng cho cả PC & Mobile)**
   - **Cài đặt NAS:** Cài app *Synology Drive Server*. Bật Team Folder cho thư mục `/volume1/Claude/`.
   - **Cài đặt Laptop:** Cài *Synology Drive Client*, kết nối qua IP `100.99.71.11`. Cấu hình sync 2 chiều (Two-way sync) thư mục `Claude` về ổ cứng máy tính (VD: `D:\Claude_Sync`).
   - **Cài đặt Mobile:** Dùng app *Synology Drive* hoặc app *FolderSync* (Android) để đồng bộ thư mục Vault về điện thoại. Sau đó dùng app Obsidian trên điện thoại mở thư mục đó.
   - *Ưu điểm:* Có versioning (khôi phục lại file lỡ xóa), có thể làm việc offline khi mất mạng, có app mobile.

2. **Phương án 2: Dùng Git Server (Khuyên dùng cho dân Tech/Coder)**
   - **Cài đặt NAS:** Cài app *Git Server*, tạo một bare repo `claude_vault.git`.
   - **Cách dùng:** Commit và push vault qua kết nối SSH (port 2242) qua IP Tailscale. Dùng plugin `Obsidian Git` để tự động commit/push mỗi 30 phút.
   - *Ưu điểm:* Tracking lịch sử cực tốt, kết hợp chuẩn với quy trình CI/CD nếu có.

3. **Phương án 3: Mount SMB trực tiếp (Như kế hoạch trước đó)**
   - Mount `\\100.99.71.11\Claude` thành ổ `Z:\` trên Windows.
   - *Ưu/Nhược:* Nhanh, không tốn dung lượng máy, nhưng **không làm việc được khi mất mạng** hoặc đứt VPN. Không dùng được cho điện thoại.

---

## 2. Tổ chức Tri thức (Knowledge Structure)

Áp dụng phương pháp **P.A.R.A** (Projects, Areas, Resources, Archives) kết hợp với cấu trúc công việc thực tế của bạn:

```text
📁 Vault_SecondBrain
├── 📂 1_Projects (Dự án đang chạy - Có deadline)
│   ├── 01_CMMS_Webapp (Dự án phần mềm bảo trì)
│   └── 02_Smarthome_Setup (Dự án nhà thông minh)
├── 📂 2_Areas (Trách nhiệm cốt lõi - Không có deadline, duy trì liên tục)
│   ├── 03_BaoTri_CoDien (Tài liệu M&E, Work Order, Lịch sử sự cố)
│   └── 04_QuanLy_NhanSu (Phân ca, đánh giá KPI kỹ thuật viên)
├── 📂 3_Resources (Tài nguyên, Kiến thức tham khảo)
│   ├── 00_QuyChuanNoiBo (SOPs, Quy trình chuẩn)
│   ├── KienThuc_IT_Docker
│   └── KienThuc_IoT_Tudonghoa
├── 📂 4_Archives (Lưu trữ dự án đã xong)
│   └── 2025_DuAn_HeThongNuoc
└── 📂 Daily_Notes (Nhật ký công việc hằng ngày)
    └── 2026-05-11.md
```

---

## 3. Top Plugins bắt buộc cho Công việc

Để biến Obsidian từ "app ghi chú" thành "Second Brain" tự động hóa:

1. **Dataview:** 
   - *Tác dụng:* Biến Vault thành Database. Bạn có thể tự động gom tất cả các file có tag `#su_co` hoặc `#checklist` vào một bảng thống kê.
   - *Ví dụ:* Tự động hiển thị danh sách các thiết bị cơ điện đang bảo trì hôm nay.
2. **Templater:** 
   - *Tác dụng:* Tạo tự động các form mẫu phức tạp. 
   - *Ví dụ:* Bạn tạo sẵn Form "Báo cáo sự cố M&E", chỉ cần bấm 1 nút là nó điền sẵn ngày giờ, người trực ca, và cấu trúc cần báo cáo.
3. **Smart Connections (AI):**
   - *Tác dụng:* Tìm kiếm ngữ nghĩa (Semantic Search) trên toàn bộ tài liệu của bạn. Hỏi AI: *"Cách xử lý sự cố bơm tăng áp tuần trước như thế nào?"*, AI sẽ đọc các file trong `03_BaoTri_CoDien` để trả lời cho bạn.
4. **Obsidian Local REST API:**
   - *Tác dụng:* Mở cổng API cục bộ cho Vault. Cho phép **Claude Code** hoặc các script tự động hóa trên NAS đọc/ghi trực tiếp vào file `.md` trong Obsidian.

---

## 4. Các bước triển khai (Action Plan)

1. **Trên Synology NAS:**
   - Đảm bảo Tailscale đang chạy tốt.
   - Cài đặt *Synology Drive Server* từ Package Center.
   - Cấp quyền cho user của bạn vào thư mục `/volume1/Claude/`. Bật thư mục này thành Team Folder trong Synology Drive Admin Console.

2. **Trên Laptop (Windows):**
   - Tải và cài đặt *Synology Drive Client*.
   - Đăng nhập bằng IP: `100.99.71.11`, chọn thư mục gốc của Vault.
   - Tải *Obsidian*, chọn "Open folder as vault" và trỏ vào thư mục vừa Sync.

3. **Bảo mật vật lý (Phòng ngừa mất máy):**
   - Không chia sẻ Vault cho bất kỳ ai.
   - Đặt mật khẩu mã hóa cho thư mục NAS (Encrypted Shared Folder) nếu cần độ bảo mật mức Enterprise.

Bạn có muốn tôi lên kịch bản hướng dẫn cài đặt **Synology Drive Server/Client** chi tiết cho bạn, hoặc hướng dẫn viết các câu lệnh **Dataview** để theo dõi công việc Bảo trì cơ điện (CMMS) trong Obsidian không?
