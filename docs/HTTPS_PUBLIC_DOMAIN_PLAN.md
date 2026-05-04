# Kế hoạch Nâng cấp HTTPS & Public Domain cho CMMS WebApp trên Synology NAS

**Ngày:** 2026-05-03  
**Phạm vi:** CMMS WebApp (Node.js, port 3090) đang chạy trên Synology NAS nội bộ  
**Mục tiêu:** Truy cập từ internet qua HTTPS với domain công khai, không mở port trực tiếp (nếu có thể)

---

## 1. Tổng quan lựa chọn kiến trúc

Có hai hướng chính để expose CMMS ra internet một cách an toàn:

| Tiêu chí | Cloudflare Tunnel | Synology Reverse Proxy + Let's Encrypt |
|---|---|---|
| **Yêu cầu mở port** | Không cần mở port 80/443 | Cần mở port 80 + 443 trên router |
| **SSL/TLS** | Cloudflare quản lý tự động | Let's Encrypt (Synology tự gia hạn) |
| **Độ phức tạp cài đặt** | Thấp (cài daemon, vài lệnh) | Trung bình (cấu hình DSM + router) |
| **Hiệu năng** | Qua CDN Cloudflare (có latency thêm) | Trực tiếp (thấp hơn) |
| **Phụ thuộc bên ngoài** | Cloudflare phải hoạt động | Chỉ phụ thuộc DNS |
| **Ẩn IP thật** | Có (IP NAS không lộ) | Không (IP WAN lộ qua DNS) |
| **Giới hạn băng thông** | Miễn phí: không giới hạn HTTP | Phụ thuộc đường truyền nhà |
| **Phù hợp khi** | ISP block port 80/443, IP động, bảo mật cao | IP tĩnh hoặc DDNS, cần latency thấp |
| **Chi phí** | Miễn phí (Cloudflare Free tier) | Miễn phí (Let's Encrypt) |

### Khuyến nghị

- **Ưu tiên: Cloudflare Tunnel** — phù hợp với hầu hết hộ gia đình/văn phòng Việt Nam do ISP thường block port 80/443; không cần lo IP động; bảo mật tốt hơn vì NAS không cần port forward.
- **Phương án dự phòng: Synology Reverse Proxy** — dùng khi cần latency thấp nhất và ISP cho phép mở port.

---

## 2. Phương án A — Cloudflare Tunnel (Khuyến nghị)

### 2.1 Kiến trúc

```
Internet
    │
    ▼
Cloudflare Edge (HTTPS, port 443)
    │  (tunnel ngầm, không cần open port)
    ▼
cloudflared daemon (chạy trên Synology NAS)
    │
    ▼
CMMS WebApp (http://localhost:3090)
```

### 2.2 Điều kiện tiên quyết

- Domain đã mua và DNS được quản lý bởi Cloudflare (ví dụ: `hapucomplex.com`)
- Synology NAS có thể ra internet (HTTP outbound)
- Tài khoản Cloudflare Free (đủ dùng)

### 2.3 Các bước cài đặt

#### Bước 1 — Chuyển DNS sang Cloudflare

1. Đăng nhập [dash.cloudflare.com](https://dash.cloudflare.com) → Add a Site → nhập domain.
2. Chọn plan Free → Cloudflare quét DNS records cũ → Import.
3. Tại registrar (Tên Miền Việt, GoDaddy, v.v.) → thay Nameserver thành 2 nameserver Cloudflare cung cấp.
4. Chờ propagation (thường 30 phút – 24 giờ).

#### Bước 2 — Tạo Tunnel trên Cloudflare

```bash
# Đăng nhập Cloudflare (chạy trên máy tính, không phải NAS)
cloudflared login

# Tạo tunnel (đặt tên gợi nhớ)
cloudflared tunnel create cmms-nas

# Lưu lại Tunnel ID xuất hiện sau lệnh trên
# Ví dụ: a1b2c3d4-e5f6-7890-abcd-ef1234567890
```

#### Bước 3 — Tạo file config tunnel

Tạo file `~/.cloudflared/config.yml` (hoặc `/volume1/docker/cloudflared/config.yml` trên NAS):

```yaml
tunnel: <TUNNEL_ID>
credentials-file: /root/.cloudflared/<TUNNEL_ID>.json

ingress:
  - hostname: cmms.hapucomplex.com
    service: http://localhost:3090
  - service: http_status:404
```

#### Bước 4 — Tạo DNS record qua Cloudflare Tunnel

```bash
cloudflared tunnel route dns cmms-nas cmms.hapucomplex.com
```

Lệnh này tự tạo CNAME record trỏ đến Cloudflare tunnel endpoint (không lộ IP NAS).

#### Bước 5 — Cài cloudflared trên Synology NAS

**Cách A — Docker (khuyến nghị):**

Tạo `docker-compose.yml`:
```yaml
version: "3"
services:
  cloudflared:
    image: cloudflare/cloudflared:latest
    restart: unless-stopped
    command: tunnel --config /etc/cloudflared/config.yml run
    volumes:
      - /volume1/docker/cloudflared:/etc/cloudflared
    network_mode: host
```

```bash
docker-compose up -d
```

**Cách B — Binary trực tiếp (DSM Terminal):**
```bash
# SSH vào NAS
wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 \
  -O /usr/local/bin/cloudflared
chmod +x /usr/local/bin/cloudflared
cloudflared service install
```

#### Bước 6 — Kiểm tra

```bash
cloudflared tunnel info cmms-nas
# Truy cập: https://cmms.hapucomplex.com
```

### 2.4 SSL/TLS với Cloudflare Tunnel

- **Cloudflare → NAS:** Mặc định là HTTP nội bộ (localhost:3090) — chấp nhận được vì traffic trong mạng nội bộ.
- **Client → Cloudflare:** Luôn HTTPS, chứng chỉ do Cloudflare quản lý.
- **Cài đặt TLS Mode:** Trong Cloudflare Dashboard → SSL/TLS → chọn **Full** (nếu NAS có self-signed cert) hoặc **Flexible** (nếu NAS chỉ HTTP).

### 2.5 Bảo mật bổ sung (tùy chọn)

```
Cloudflare Dashboard → Access → Applications
→ Thêm Access Policy: chỉ cho phép email @hapucomplex.com
```

Bật **Zero Trust Access** để yêu cầu xác thực trước khi vào CMMS — miễn phí đến 50 users.

---

## 3. Phương án B — Synology Reverse Proxy + Let's Encrypt

### 3.1 Kiến trúc

```
Internet
    │
    ▼
Router/Modem (NAT: 443 → NAS:443, 80 → NAS:80)
    │
    ▼
Synology DSM Reverse Proxy (HTTPS, port 443)
│   SSL termination (Let's Encrypt cert)
    │
    ▼
CMMS WebApp (http://localhost:3090)
```

### 3.2 Điều kiện tiên quyết

- Domain đã mua (ví dụ: `hapucomplex.com`)
- IP WAN tĩnh **hoặc** DDNS đã cấu hình
- Router cho phép port forward 80 và 443 vào IP của NAS
- Synology DSM 7.x

### 3.3 Các bước cài đặt

#### Bước 1 — Cấu hình DDNS (nếu IP động)

**Cách A — Dùng DDNS của Synology (miễn phí):**
```
DSM → Control Panel → External Access → DDNS
→ Add: Provider = Synology, Hostname = hapucomplex.synology.me
```

**Cách B — Dùng domain riêng với Cloudflare DDNS:**
Cài package `ddclient` hoặc script tự động cập nhật A record qua Cloudflare API:

```bash
# Script cron trên NAS (chạy mỗi 5 phút)
#!/bin/bash
ZONE_ID="<cloudflare_zone_id>"
RECORD_ID="<dns_record_id>"
API_TOKEN="<cloudflare_api_token>"
IP=$(curl -s https://api.ipify.org)

curl -X PUT "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/dns/records/$RECORD_ID" \
  -H "Authorization: Bearer $API_TOKEN" \
  -H "Content-Type: application/json" \
  --data "{\"type\":\"A\",\"name\":\"cmms.hapucomplex.com\",\"content\":\"$IP\",\"ttl\":120}"
```

#### Bước 2 — Port Forward trên Router

| Giao thức | Port ngoài | Port trong (NAS IP) |
|---|---|---|
| TCP | 80 | 192.168.x.x:80 |
| TCP | 443 | 192.168.x.x:443 |

> **Lưu ý:** Một số ISP Việt Nam block port 80/443 trên gói dân dụng. Liên hệ ISP để kiểm tra hoặc dùng port thay thế (8080/8443) rồi cấu hình DNS SRV.

#### Bước 3 — Cấu hình Let's Encrypt trên Synology DSM

```
DSM → Control Panel → Security → Certificate
→ Add Certificate → Get a certificate from Let's Encrypt
→ Domain name: cmms.hapucomplex.com
→ Email: trucdienhapulico@gmail.com
→ Subject Alternative Name: (để trống hoặc thêm alias)
```

DSM sẽ tự động gia hạn chứng chỉ mỗi 90 ngày.

#### Bước 4 — Cấu hình Reverse Proxy trên Synology DSM

```
DSM → Control Panel → Login Portal → Advanced → Reverse Proxy
→ Create:
   Description:  CMMS WebApp
   Source:
     Protocol:   HTTPS
     Hostname:   cmms.hapucomplex.com
     Port:       443
   Destination:
     Protocol:   HTTP
     Hostname:   localhost
     Port:       3090
```

**Custom Headers (quan trọng cho session/cookie):**

| Header | Value |
|---|---|
| `X-Real-IP` | `$remote_addr` |
| `X-Forwarded-For` | `$proxy_add_x_forwarded_for` |
| `X-Forwarded-Proto` | `https` |
| `Upgrade` | `$http_upgrade` |
| `Connection` | `upgrade` |

#### Bước 5 — Cập nhật server.js để nhận proxy headers

```js
// server.js — thêm sau khi khởi tạo app
app.set('trust proxy', 1); // Tin tưởng Synology Reverse Proxy
```

#### Bước 6 — Cấu hình DNS

Tạo A record tại DNS provider:
```
Type:  A
Name:  cmms
Value: <IP WAN của router>
TTL:   300 (hoặc 1 phút nếu IP động)
```

#### Bước 7 — Kiểm tra

```bash
# Kiểm tra cert
curl -vI https://cmms.hapucomplex.com 2>&1 | grep -E "SSL|subject|issuer"

# Kiểm tra app
curl https://cmms.hapucomplex.com/api/health
```

---

## 4. So sánh chi tiết theo tình huống thực tế

### Tình huống 1: ISP block port 80/443 (phổ biến ở Việt Nam)
- **Cloudflare Tunnel:** Hoạt động tốt — không cần open port
- **Synology RP:** Không khả thi trừ khi dùng port lạ

### Tình huống 2: IP WAN động, thay đổi thường xuyên
- **Cloudflare Tunnel:** Hoạt động tốt — tunnel không phụ thuộc IP
- **Synology RP:** Cần DDNS, có độ trễ khi IP thay đổi

### Tình huống 3: Nhiều người dùng đồng thời, cần latency thấp
- **Cloudflare Tunnel:** Thêm ~10-50ms do qua CDN
- **Synology RP:** Trực tiếp, latency tốt nhất trong mạng nội bộ lân cận

### Tình huống 4: Bảo mật tối đa
- **Cloudflare Tunnel + Zero Trust Access:** Tốt nhất — thêm lớp xác thực trước khi vào app
- **Synology RP:** Phụ thuộc hoàn toàn vào auth của CMMS app

---

## 5. Cấu hình bảo mật bắt buộc (áp dụng cho cả 2 phương án)

### 5.1 HTTPS Redirect

```js
// server.js
app.use((req, res, next) => {
  if (req.headers['x-forwarded-proto'] === 'http') {
    return res.redirect(301, `https://${req.headers.host}${req.url}`);
  }
  next();
});
```

### 5.2 Security Headers

```js
// server.js
app.use((req, res, next) => {
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});
```

### 5.3 Rate Limiting cho API

```js
// Cần cài: npm install express-rate-limit
const rateLimit = require('express-rate-limit');
app.use('/api/', rateLimit({
  windowMs: 15 * 60 * 1000, // 15 phút
  max: 200,                  // tối đa 200 request/IP/15 phút
  message: { ok: 0, error: 'Quá nhiều request, thử lại sau.' }
}));
```

### 5.4 Session Cookie Hardening

```js
// server.js — cấu hình session
app.use(session({
  secret: process.env.SESSION_SECRET, // Dùng biến môi trường
  cookie: {
    secure: true,   // Chỉ gửi qua HTTPS
    httpOnly: true, // Ngăn JS đọc cookie
    sameSite: 'strict',
    maxAge: 8 * 60 * 60 * 1000 // 8 giờ
  },
  resave: false,
  saveUninitialized: false
}));
```

---

## 6. Kế hoạch triển khai

### Giai đoạn 1 — Chuẩn bị (1-2 ngày)
- [ ] Mua/chuyển domain sang Cloudflare (nếu chưa có)
- [ ] Tạo tài khoản Cloudflare, add domain
- [ ] Kiểm tra ISP có block port 80/443 không: `curl -v telnet://0.0.0.0:80` từ ngoài mạng

### Giai đoạn 2 — Triển khai Tunnel (1 buổi)
- [ ] Tạo Cloudflare Tunnel
- [ ] Cài cloudflared trên NAS (Docker)
- [ ] Kiểm tra HTTPS hoạt động
- [ ] Bật Zero Trust Access (tùy chọn)

### Giai đoạn 3 — Hardening (1 buổi)
- [ ] Thêm security headers vào server.js
- [ ] Hardening session cookie
- [ ] Cài rate limiting
- [ ] Test toàn bộ API endpoints qua HTTPS

### Giai đoạn 4 — Giám sát (liên tục)
- [ ] Bật Cloudflare Analytics theo dõi traffic
- [ ] Cấu hình alert khi tunnel down
- [ ] Đổi mật khẩu mặc định `admin/admin123` trước khi public

---

## 7. Checklist trước khi Go-Live

- [ ] Domain trỏ đúng (A record hoặc CNAME)
- [ ] HTTPS hoạt động, cert hợp lệ (`curl -I https://cmms.hapucomplex.com`)
- [ ] HTTP tự redirect sang HTTPS
- [ ] Session cookie có `Secure; HttpOnly; SameSite=Strict`
- [ ] Không dùng mật khẩu mặc định
- [ ] Rate limiting hoạt động
- [ ] Backup `db.json` định kỳ
- [ ] Firewall DSM: chỉ cho phép port 3090 từ localhost (ngăn bypass reverse proxy)

---

## 8. Tài liệu tham khảo

- [Cloudflare Tunnel Docs](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/)
- [Cloudflare Zero Trust Access](https://developers.cloudflare.com/cloudflare-one/applications/configure-apps/)
- [Synology DSM Reverse Proxy Guide](https://kb.synology.com/en-global/DSM/help/DSM/AdminCenter/system_login_portal_advanced)
- [Let's Encrypt on Synology](https://kb.synology.com/en-us/DSM/tutorial/How_to_enable_HTTPS_and_create_a_certificate_signing_request_on_your_Synology_NAS)
- [express-rate-limit](https://www.npmjs.com/package/express-rate-limit)
