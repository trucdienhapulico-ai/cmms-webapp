# Hướng dẫn Go-Live bằng tên miền miễn phí của Synology (Synology DDNS)

Vì bạn đang sử dụng NAS Synology, bạn được cấp miễn phí một tên miền có dạng `xxx.synology.me` (hoặc các đuôi khác của hãng) kèm theo chứng chỉ HTTPS tự động gia hạn.

Dưới đây là các bước để public CMMS WebApp ra Internet bằng công cụ có sẵn của NAS:

## Bước 1: Kích hoạt Tên miền miễn phí (DDNS)
1. Đăng nhập vào giao diện web của Synology NAS (DSM).
2. Mở **Control Panel** ➔ Chọn **External Access** ➔ Chuyển sang tab **DDNS**.
3. Bấm nút **Add** (Thêm).
4. Điền các thông tin sau:
   - **Service provider:** Chọn `Synology`.
   - **Hostname:** Nhập tên bạn muốn (ví dụ: `cmms-hapu`) và chọn đuôi `synology.me` (Kết quả: `cmms-hapu.synology.me`).
   - Tích chọn ô **"Get a certificate from Let's Encrypt..."** (Rất quan trọng để có HTTPS).
5. Bấm **Test Connection** để kiểm tra, nếu OK thì bấm **OK** để lưu.

## Bước 2: Trỏ Tên miền vào ứng dụng CMMS (Reverse Proxy)
Bây giờ tên miền đã có, ta cần bảo NAS "khi có người truy cập tên miền này, hãy dẫn họ vào cổng 8080 của CMMS".
1. Vẫn ở trong **Control Panel**, kéo xuống tìm mục **Login Portal** ➔ Chuyển sang tab **Advanced** ➔ Bấm nút **Reverse Proxy**.
2. Bấm **Create** (Tạo mới) và điền như sau:
   - **Tên (Description):** `CMMS WebApp`
   - **Source (Nguồn tới):**
     - Protocol: Chọn **HTTPS**
     - Hostname: Nhập tên miền bạn vừa tạo ở Bước 1 (vd: `cmms-hapu.synology.me`)
     - Port: Nhập `443`
   - **Destination (Đích đến):**
     - Protocol: Chọn **HTTP**
     - Hostname: Nhập `localhost`
     - Port: Nhập `8080`
3. Chuyển sang tab **Custom Header** (ở cùng cửa sổ đó), bấm nút mũi tên sổ xuống ➔ chọn **WebSocket**. (Bước này để đảm bảo các tính năng thời gian thực hoạt động tốt).
4. Bấm **Save**.

## Bước 3: Mở Cổng (Port Forwarding) trên Router/Modem mạng
Đây là bước cuối cùng để người từ ngoài Internet (dùng 4G) có thể đi vào mạng nhà/công ty bạn.
1. Đăng nhập vào Modem/Router mạng của nhà mạng (thường là địa chỉ `192.168.1.1` hoặc `192.168.0.1`).
2. Tìm đến mục **Port Forwarding** (hoặc NAT, Virtual Server tùy loại Modem).
3. Thêm một quy tắc (Rule) mới:
   - **IP đích (Internal IP):** Nhập địa chỉ IP nội bộ của cục NAS.
   - **Port ngoài (External Port):** `443`
   - **Port trong (Internal Port):** `443`
   - **Protocol:** `TCP`
4. Lưu lại cấu hình trên Modem.

---
🎉 **Hoàn thành!** Bây giờ bạn có thể dùng điện thoại (tắt WiFi, dùng 4G) và truy cập vào địa chỉ:
`https://cmms-hapu.synology.me` (Thay bằng tên bạn đã chọn).

Trình duyệt sẽ hiện ổ khóa an toàn màu xanh, và bạn đã có thể bắt đầu sử dụng tính năng Quét mã QR!
