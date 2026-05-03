# 🤖 Quy trình Dual-Agent Tối Ưu Token (Issue-Based Workflow)

Tài liệu này hướng dẫn cách phối hợp giữa **Architect (IDE/Antigravity)** và **Builder (Claude Code CLI)** thông qua GitHub Issues để giảm thiểu số lượng token bị lãng phí do việc đọc lại mã nguồn liên tục.

## 🎯 Mục tiêu
Giảm tải lượng dữ liệu Claude Code phải đọc mỗi khi bắt đầu task. Thay vì đọc toàn bộ codebase và các file docs dài (hàng vạn token), Claude Code chỉ cần đọc nội dung của 1 GitHub Issue duy nhất.

## 👥 Vai trò
1. **Architect (AI trong IDE - Antigravity):**
   - Nắm bắt bối cảnh hệ thống rộng lớn.
   - Lập roadmap tổng thể (`roadmap.md`) và quản lý chi tiết (`task.md`).
   - Lên thiết kế giải pháp và viết ra GitHub Issue.
2. **Builder (Claude Code CLI chạy ngầm):**
   - Chạy nền (background) qua `claude-worker.ps1` không cần giám sát.
   - Đọc Issue, vào sửa đúng file được yêu cầu, sau đó commit và push.

## 📝 Cách thức Giao Việc (Dành cho Chủ Project hoặc Architect)

Khi cần tính năng mới hoặc fix bug, không giao việc trực tiếp bằng lệnh dài cho Claude Code. Thay vào đó, hãy **tạo GitHub Issue** có gắn nhãn `claude-todo`.

### Format chuẩn của một Issue giao việc:
```markdown
[Title]: [Feature] Tên chức năng / Tên tác vụ ngắn gọn

[Body]:
Bạn là Builder. Hãy thực hiện task này với phạm vi hẹp nhất có thể.

1. File cần sửa: `đường/dẫn/file.js`
2. Logic cần thay đổi: 
   - Thêm hàm `A` vào dòng XYZ.
   - Sửa logic `B` để xử lý ngoại lệ.
3. Chú ý: Không đọc các file ngoài phạm vi này. Không thay đổi kiến trúc.

Sau khi xong, hãy run test, commit, push code và tự động đóng issue này.
```

## ⚙️ Cơ chế Tự Động Hóa (Worker)
Bạn hãy chạy file `claude-worker.ps1` ở thư mục gốc của dự án.
- Cứ mỗi 30 phút, script sẽ tự động quét GitHub Issue.
- Bất cứ khi nào bạn tạo một Issue có nhãn `claude-todo`, script sẽ báo động và tự khởi chạy Claude Code với context được thu hẹp tối đa vào nội dung Issue đó.
- Code xong, hệ thống tự push và dọn dẹp. Bạn chỉ việc mở GitHub lên check kết quả.

## 🗺️ Quy ước Cập nhật Giao diện (Dành cho Cả Architect & Builder)
Hệ thống có một chức năng nội bộ mang tên **Sơ đồ UI / Góp ý (UI Map)** được code sẵn tại hàm `renderUIMap()` trong file `public/index.html`.
Bất cứ khi nào bạn thay đổi cấu trúc giao diện, thêm màn hình mới, thêm tính năng hoặc di chuyển vị trí các nút:
- **BẮT BUỘC** phải tìm đến hàm `renderUIMap()` và cập nhật/bổ sung thông tin vào bảng Sơ đồ UI.
- Thêm Mã định vị chuẩn xác (ví dụ: `[UI-TênKhuVực-TênThànhPhần]`) để người dùng (USER) có thể copy mã đó paste vào yêu cầu (Issue) lần sau.
- Việc này giúp AI thế hệ sau luôn biết chính xác vị trí cần sửa khi USER cung cấp một mã UI thay vì phải diễn đạt mơ hồ.
