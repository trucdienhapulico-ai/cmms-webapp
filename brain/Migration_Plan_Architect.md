# Kế hoạch Migration Workspace lên NAS Synology

Dựa trên tài liệu hướng dẫn `D:\NASAi\Prompt_ClaudeCode_MigrateToNAS.md` và luật quản trị AI Workflow (tối đa 3 task/lần, cần duyệt trước khi thực thi), tôi đã đọc hiểu và phân tích dự án. Dưới đây là kế hoạch chuyển giao công việc cho **Claude Code (Builder)**.

## Tóm tắt Hiện trạng Dự án (CMMS WebApp)
- Dự án đang ở **Phase 3.5: Hardening & Optimization**. Trọng tâm là dọn dẹp các lỗ hổng bảo mật, dọn dẹp dữ liệu runtime, XSS, và đảm bảo môi trường sạch.
- Việc migrate lên NAS là một bước quan trọng để chuyển môi trường làm việc từ máy cá nhân (`D:\Claude`) lên vault trung tâm trên Synology NAS (`/volume1/Claude`), cho phép webapp chạy như một service tập trung và đồng bộ vault bằng Obsidian.

## Chiến lược Phân chia Task (Task Proposals)
Để tuân thủ quy tắc giới hạn số lượng task sinh tự động và yêu cầu duyệt, tôi sẽ chia quy trình 7 bước thành **3 Task Proposals**. Các file này sẽ được tạo trong `brain/tasks_proposal/` của dự án để Admin (bạn) duyệt trước khi đưa vào hàng đợi (`tasks_queue`).

### Task 1: Thiết lập NAS & Đồng bộ Dữ liệu
Bao gồm Task 1, 2, 3 từ hướng dẫn gốc.
- Kiểm tra kết nối SSH (`synologybot@100.99.71.11:2242`).
- Khởi tạo cây thư mục chuẩn cho Vault trên NAS.
- Copy an toàn các file `.md`, cấu hình và code (dùng SCP/Rsync), loại trừ `node_modules` và `.git`.

### Task 2: Cài đặt Môi trường & Obsidian Config
Bao gồm Task 4, 5, 6 từ hướng dẫn gốc.
- Kiểm tra và cài đặt Node.js v18 (qua nvm) trên NAS nếu chưa có.
- Chạy `npm install` và khởi động CMMS Webapp tại port 3090. Kiểm tra API Health.
- Tạo thư mục `.obsidian/` và thiết lập `app.json`, `workspace.json`.
- Tạo template chuẩn cho Daily Note Kỹ thuật viên.

### Task 3: Kiểm tra Tổng thể & Nghiệm thu
Bao gồm Task 7 từ hướng dẫn gốc.
- Quét toàn bộ NAS để đối chiếu cây thư mục, dung lượng file và kiểm tra lại source code.
- Cập nhật báo cáo trạng thái vào `handoff.md` hoặc báo cáo trên Terminal với bảng Checklist hoàn tất các tiêu chí nghiệm thu.

---

> [!NOTE]
> Tôi đã tự động tạo sẵn 3 file task này vào thư mục `brain/tasks_proposal/` trong workspace.
> Bạn chỉ cần kiểm tra lại nội dung các file đó và chuyển chúng sang `brain/tasks_queue/` để Claude Code bắt đầu quá trình thực thi trên Terminal.
