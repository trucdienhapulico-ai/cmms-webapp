# Hướng dẫn cấu hình Tên miền (Route) cho Cloudflare Tunnel

Sau khi bạn đã cài đặt mã Token thành công vào NAS, Container `cloudflared` đã được kết nối ngầm với server của Cloudflare. Bước cuối cùng để "mở cửa" ra Internet là khai báo tên miền bạn muốn dùng và trỏ nó vào ứng dụng CMMS bên trong NAS.

Hãy làm theo các bước siêu đơn giản sau đây trên máy tính của bạn:

## Bước 1: Truy cập Cloudflare Zero Trust
1. Mở trình duyệt và đăng nhập vào [Cloudflare Zero Trust Dashboard](https://one.dash.cloudflare.com).
2. Ở thanh menu bên trái, chọn mục **Networks** ➔ **Tunnels**.
3. Bạn sẽ thấy Tunnel có tên `cmms` (hoặc tên bạn đã đặt) hiện trạng thái **`Healthy`** màu xanh lá. (Nếu hiện Healthy tức là cấu hình trên NAS đã thành công 100%).

## Bước 2: Thiết lập Public Hostname (Tên miền truy cập)
1. Bấm vào Tunnel `cmms` của bạn ➔ chọn **Configure** (Cấu hình).
2. Chuyển sang tab **Public Hostname** (ở trên cùng).
3. Bấm nút màu xanh **Add a public hostname**.

## Bước 3: Điền thông tin kết nối
Một bảng cấu hình sẽ hiện ra, bạn điền chính xác như sau:

**Phần Public Hostname (Tên miền muốn dùng):**
- **Subdomain:** Nhập `cmms` (Hoặc bất cứ tên gì bạn muốn, ví dụ: `app`, `baotri`).
- **Domain:** Chọn tên miền của bạn từ danh sách thả xuống (Ví dụ: `hapucomplex.com`).
- *(Kết quả bạn sẽ có link truy cập là: `https://cmms.hapucomplex.com`)*

**Phần Service (Đường dẫn trỏ vào NAS):**
Vì Cloudflare Tunnel chạy bằng Docker và nằm **cùng một mạng nội bộ (cmms-net)** với Nginx và app CMMS, nó có thể gọi thẳng tên container thay vì dùng IP.
- **Type:** Chọn `HTTP`
- **URL:** Nhập `cmms-nginx:8080` 

*(Lưu ý: Nếu bạn muốn trỏ vào bản Test thay vì bản Stable, bạn có thể tạo một Public Hostname thứ 2, ví dụ `cmms-test.hapucomplex.com`, và nhập URL là `cmms-nginx:8081`)*

## Bước 4: Lưu và Trải nghiệm
1. Bấm **Save hostname** ở góc dưới cùng bên phải.
2. Cloudflare sẽ tự động cập nhật hệ thống DNS (chỉ mất khoảng 5 giây).
3. Bây giờ bạn mở tab ẩn danh mới hoặc dùng điện thoại mạng 4G, truy cập vào `https://cmms.hapucomplex.com`.

**Bùm! 🚀 App CMMS của bạn sẽ xuất hiện cùng với thẻ xanh HTTPS an toàn tuyệt đối.** Tính năng Quét QR nay đã có thể sử dụng được vì trình duyệt trên điện thoại đã cho phép bật Camera trên môi trường HTTPS.
