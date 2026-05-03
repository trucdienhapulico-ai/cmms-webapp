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

## ⚙️ Hệ thống Hàng đợi Tác vụ (Task Queue Protocol)

Tất cả các tác vụ được quản lý bằng **file trong thư mục `brain/`**, không phải qua GitHub Issues trực tiếp. Quy trình này áp dụng cho **CẢ HAI** agent:

### Cấu trúc thư mục
```
brain/
  ├── roadmap.md          # Tiến độ tổng quát
  ├── tasks_queue/        # Hàng đợi – bỏ file .txt vào đây để giao việc
  └── tasks_done/         # Lịch sử – file đã xong hoặc lỗi
```

### Vòng đời của một tác vụ (Lifecycle)
```
[1] .txt        → Đang chờ trong hàng đợi (chưa ai nhận)
[2] .working    → Đang được xử lý (một agent đã nhận)
[3] .done.txt   → Hoàn thành (chuyển sang tasks_done/)
[4] .failed.txt → Lỗi / bị hủy (chuyển sang tasks_done/)
```

### Quy tắc BẮT BUỘC cho cả Antigravity & Claude Code
1. **Trước khi bắt đầu** một task: Đổi đuôi file từ `.txt` → `.working`
2. **Sau khi hoàn thành** task: Di chuyển file sang `brain/tasks_done/` với đuôi `.done.txt`
3. **Nếu gặp lỗi** hoặc bị hủy: Di chuyển sang `brain/tasks_done/` với đuôi `.failed.txt`
4. **Khi khởi động lại**: Quét tìm file `.working` bị kẹt → đổi lại thành `.txt` (phục hồi)
5. **Antigravity khi tự làm Issue thay Claude Code**: Cũng PHẢI tuân thủ đúng quy trình đổi đuôi file này để tránh Claude Code làm lại task đã xong.

### Cách giao việc
- **Cho Claude Code**: Tạo file `.txt` trong `brain/tasks_queue/`, sau đó chạy `.\claude-worker.ps1`
- **Cho Antigravity tự làm**: USER yêu cầu trực tiếp. Antigravity tự đổi đuôi file tương ứng.
- **Hẹn giờ**: Chạy `.\schedule-worker.ps1` để đặt alarm cho Claude Code thức dậy vào giờ chỉ định.

## 🗺️ Quy ước Cập nhật Giao diện (Dành cho Cả Architect & Builder)
Hệ thống có một chức năng nội bộ mang tên **Sơ đồ UI / Góp ý (UI Map)** được code sẵn tại hàm `renderUIMap()` trong file `public/index.html`.
Bất cứ khi nào bạn thay đổi cấu trúc giao diện, thêm màn hình mới, thêm tính năng hoặc di chuyển vị trí các nút:
- **BẮT BUỘC** phải tìm đến hàm `renderUIMap()` và cập nhật/bổ sung thông tin vào bảng Sơ đồ UI.
- Thêm Mã định vị chuẩn xác (ví dụ: `[UI-TênKhuVực-TênThànhPhần]`) để người dùng (USER) có thể copy mã đó paste vào yêu cầu (Issue) lần sau.
- Việc này giúp AI thế hệ sau luôn biết chính xác vị trí cần sửa khi USER cung cấp một mã UI thay vì phải diễn đạt mơ hồ.

### 🎨 UI/UX CONVENTIONS: M&E OPERATIONS

**1. Mobile-First & Phone-Native**
- **Core:** One-hand operation, bottom sheets, gesture-based actions (swipe).
- **Data Entry:** QR/NFC-first > AI Vision > Pickers > Manual input.
- **Onboarding:** Rapid "Zero-Config" flow (Setup-to-Action < 60s).

**2. Modern Design System**
- **Layout:** Card-centric, clean typography, high-contrast status colors (Green/Amber/Red).
- **Scalability:** Responsive logic for both SME (simple) and Enterprise (complex) assets.
- **Performance:** Ultra-low latency; real-time telemetry focus.

**3. AI-Powered Insights**
- **Predictive:** Show "Next Failure Date" instead of just "Status OK."
- **Search:** Natural Language Processing (NLP) for instant SOP & drawing retrieval.
- **Smart Forms:** Autocomplete technical reports using historical operational data.

**Principle:** Minimal Taps, Maximal Insight.
