# 🚀 Hướng dẫn Triển khai CMMS lên Synology NAS

Tài liệu này hướng dẫn cách đưa ứng dụng CMMS lên Docker của Synology NAS `onecloud`.

## 1. Chuẩn bị trên NAS
- Đảm bảo đã cài đặt package **Docker** (hoặc **Container Manager** trên DSM 7.2+).
- Đảm bảo đã bật SSH tại: `Control Panel > Terminal & SNMP > Enable SSH service` (Port: 2242).

## 2. Phương thức triển khai
Chúng ta sẽ sử dụng Docker Compose để chạy 3 container:
1. `cmms-stable`: Bản chính thức (Port 8080).
2. `cmms-test`: Bản thử nghiệm (Port 8081).
3. `cmms-nginx`: Reverse Proxy để điều phối.

## 3. Các bước thực hiện (Dành cho Builder/User)

### Bước 1: Sao chép mã nguồn lên NAS
Sử dụng `scp` từ máy local:
```bash
scp -P 2242 -r ./cmms-webapp synologybot@onecloud:/volume1/docker/
```

### Bước 2: Truy cập NAS qua SSH
```bash
ssh synologybot@onecloud -p 2242
```

### Bước 3: Khởi chạy Docker Compose
```bash
cd /volume1/docker/cmms-webapp
docker-compose -f deploy/docker-compose.yml up -d --build
```

## 4. Quản lý và Bảo trì
- **Xem log:** `docker-compose -f deploy/docker-compose.yml logs -f`
- **Dữ liệu:** Dữ liệu Database (JSON) được lưu tại các Volume `cmms-stable-data` và `cmms-test-data` trong Docker.
- **Cập nhật code:** Lặp lại Bước 1 và Bước 3.

## 5. Truy cập
- Môi trường Stable: `http://onecloud:8080`
- Môi trường Test: `http://onecloud:8081`
