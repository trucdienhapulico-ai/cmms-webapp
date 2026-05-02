# CMMS Webapp

Web app CMMS nội bộ cho quản lý bảo trì hệ thống cơ điện.

## Truy cập Docker hiện tại

- **Stable LAN:** http://192.168.1.14:8080
- **Test LAN:** http://192.168.1.14:8081
- **Public URL stable qua Tailscale Funnel:** https://tocodien.tail030e1.ts.net/
- **Public URL test:** chưa mở public; test `8081` chỉ dùng trong LAN.

## Ghi chú vận hành

- Public URL hiện đang trỏ về Docker stable `127.0.0.1:8080`.
- Service cũ cổng `3080` không còn là chuẩn vận hành.
- Domain/HTTPS riêng và PostgreSQL stable/test tách biệt để triển khai ở giai đoạn sau.
