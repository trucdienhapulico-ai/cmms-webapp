# Roadmap Triển khai Obsidian Second Brain

Vì Claude Code CLI (với vai trò Builder) hoạt động qua Terminal, chúng ta sẽ giao cho Claude tự động hóa việc tạo cấu trúc thư mục P.A.R.A, cài đặt Plugin (bằng cách tải trực tiếp từ GitHub Releases qua lệnh `curl`/`wget` vào thư mục `.obsidian/plugins`), và viết sẵn các Template, Dashboard. 

Việc duy nhất bạn (Admin) cần làm thủ công là thao tác UI cài đặt Synology Drive.

---

## Giai đoạn 1: Thiết lập Cấu trúc Cốt lõi & Templates
Mục tiêu: Đưa cấu trúc P.A.R.A vào hoạt động và chuẩn hóa các biểu mẫu.

- **Task 1: Xây dựng Cấu trúc P.A.R.A**
  - Tạo các thư mục `1_Projects`, `2_Areas`, `3_Resources`, `4_Archives`, `Templates`.
  - Di chuyển các thư mục cũ (như `01_CMMS_Webapp`, `03_BaoTri_CoDien`) vào đúng vị trí của hệ thống P.A.R.A mới để quản lý tập trung.
- **Task 2: Viết các form Template chuẩn**
  - Template 1: `Daily Note` (Nhật ký ca làm việc).
  - Template 2: `M&E Incident Report` (Báo cáo sự cố cơ điện).
  - Template 3: `Meeting Note` (Ghi chú họp ban quản lý).

## Giai đoạn 2: Tự động hóa với Plugins (Tải qua CLI)
Mục tiêu: Cài đặt và cấu hình sẵn các Plugin tự động hóa mạnh mẽ nhất mà không cần mở giao diện Obsidian.

- **Task 3: Cài đặt & Cấu hình Dataview**
  - Tải release mới nhất của Dataview từ GitHub.
  - Giải nén vào `.obsidian/plugins/dataview`.
  - Kích hoạt trong `community-plugins.json`.
- **Task 4: Cài đặt & Cấu hình Templater**
  - Tải release mới nhất của Templater từ GitHub.
  - Cấu hình file `data.json` của Templater để trỏ thư mục template về `Templates/`.

## Giai đoạn 3: Dashboards & AI Integration
Mục tiêu: Xây dựng trung tâm điều khiển (Control Center) và kết nối AI.

- **Task 5: Xây dựng Dashboard Quản lý Cơ điện**
  - Tạo file `00_Dashboard_M&E.md` tại thư mục gốc.
  - Viết các đoạn code Dataview để tự động liệt kê: Sự cố chưa xử lý, Công việc đang làm, Nhật ký ca trực hôm nay.
- **Task 6: Cài đặt Smart Connections & REST API**
  - Tải và cài đặt plugin `Smart Connections` (cho semantic search) và `Local REST API` (cho phép Claude MCP giao tiếp với vault sau này).

---

## Giai đoạn 4: Đồng bộ & Bảo mật (Manual by Admin)
*Lưu ý: Giai đoạn này yêu cầu thao tác UI, nên bạn sẽ tự thực hiện:*
- Đăng nhập Synology DSM -> Package Center -> Cài **Synology Drive Server**.
- Bật Team Folder cho `/volume1/Claude/`.
- Tải Synology Drive Client lên Windows, kết nối qua Tailscale IP (`100.99.71.11`) và đồng bộ 2 chiều.
