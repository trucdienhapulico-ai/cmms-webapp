# CMMS – Hướng dẫn Khôi phục Hệ thống (Disaster Recovery)

> **Khi nào dùng tài liệu này?**
> Server hỏng, container bị xóa nhầm, dữ liệu db.json bị corrupt, hoặc cần dựng lại hệ thống trên máy mới.

---

## Các loại Backup hiện có

| Loại | Vị trí | Tạo khi nào |
|------|--------|-------------|
| DB snapshot (tự động) | `backups/stable_db_YYYYMMDD_HHMMSS.json` | Chạy `deploy-stable.sh` hoặc `backup-stable.sh` |
| Manual snapshot | `backups/manual_YYYYMMDD/` | Trước checkpoint lớn (db.json + env + docker-compose.yml) |
| Full project ZIP | `backups/cmms-backup-TIMESTAMP.zip` | Chạy `npm run backup` |
| Git branch | `checkpoint-pre-phase4` (và `master`) | Mỗi lần push code |

---

## Kịch bản 1: Khôi phục từ ZIP (Máy mới / NAS mới)

Dùng khi: Cần dựng lại toàn bộ từ đầu.

### Bước 1 – Lấy file backup

Tìm file ZIP mới nhất trong thư mục `backups/`:
```bash
ls -lt backups/*.zip | head -5
```

### Bước 2 – Giải nén

```bash
mkdir -p /volume1/docker/cmms-webapp
unzip backups/cmms-backup-TIMESTAMP.zip -d /volume1/docker/cmms-webapp
cd /volume1/docker/cmms-webapp
```

### Bước 3 – Khôi phục file môi trường (.env)

File `.env` không nằm trong ZIP (được gitignore). Lấy từ manual snapshot:
```bash
mkdir -p env
cp backups/manual_YYYYMMDD/stable.env env/stable.env
cp backups/manual_YYYYMMDD/test.env   env/test.env
```

Nếu không có backup env, tạo mới từ mẫu rồi điền lại `SECRET_KEY`:
```bash
cp env/stable.env.example env/stable.env
# Mở file và chỉnh SECRET_KEY thành giá trị production thực tế
nano env/stable.env
```

### Bước 4 – Cài đặt dependencies

```bash
npm install --production
```

### Bước 5 – Khởi động containers

```bash
docker compose -f deploy/docker-compose.yml up -d --build
```

### Bước 6 – Khôi phục dữ liệu DB vào volume (nếu volume trống)

```bash
# Copy db.json từ manual backup vào volume stable
docker run --rm \
  -v cmms-stable-data:/data \
  -v "$(pwd)/backups/manual_YYYYMMDD":/src \
  alpine:3 \
  cp /src/db.json /data/db.json

echo "DB khôi phục xong."
```

---

## Kịch bản 2: Khôi phục từ Git (Code bị hỏng, cần rollback)

Dùng khi: Code production bị lỗi, cần quay lại checkpoint ổn định.

### Bước 1 – Clone repo

```bash
git clone https://github.com/trucdienhapulico-ai/cmms-webapp.git
cd cmms-webapp
```

### Bước 2 – Checkout checkpoint ổn định

```bash
# Xem các tag/branch checkpoint
git tag -l
git branch -a

# Quay về checkpoint trước Phase 4
git checkout checkpoint-pre-phase4
```

### Bước 3 – Tiếp tục từ Bước 3 của Kịch bản 1

---

## Kịch bản 3: Khôi phục chỉ dữ liệu DB (Container vẫn chạy)

Dùng khi: db.json bị corrupt nhưng containers vẫn còn, chỉ cần restore data.

```bash
# Dừng container stable để tránh ghi đè
docker stop cmms-stable

# Xác định file backup cần dùng
ls -lt backups/stable_db_*.json | head -5

# Restore db.json vào volume
docker run --rm \
  -v cmms-stable-data:/data \
  -v "$(pwd)/backups":/backup \
  alpine:3 \
  cp /backup/stable_db_YYYYMMDD_HHMMSS.json /data/db.json

# Khởi động lại
docker start cmms-stable
```

---

## Xác minh sau khi khôi phục

Chạy health check tự động:
```bash
bash deploy/scripts/healthcheck.sh
```

Kiểm tra thủ công:
```bash
# API health
curl -s http://localhost:8080/api/health
# Kết quả mong đợi: {"ok":1,"status":"healthy",...}

# Xem log 50 dòng cuối
bash deploy/scripts/logs.sh stable
```

Kiểm tra dữ liệu:
```bash
# Đọc db.json từ volume
docker run --rm \
  -v cmms-stable-data:/data \
  alpine:3 \
  cat /data/db.json | head -20
```

Đăng nhập thử qua trình duyệt:
- URL: `http://onecloud:8080` (hoặc `http://localhost:8080`)
- Tài khoản: `admin` / (mật khẩu trong `stable.env`)

---

## Kiểm thử Clean-Restore (Simulation)

Chạy định kỳ để đảm bảo backup có thể dùng được. **Thực hiện trên máy test, không phải production.**

```bash
# 1. Dừng và xóa toàn bộ stack (XÓA DỮ LIỆU – chỉ trên máy test)
docker compose -f deploy/docker-compose.yml down -v

# 2. Xác nhận volume đã bị xóa
docker volume ls | grep cmms

# 3. Chạy lại toàn bộ Kịch bản 1 (Bước 4–6)
docker compose -f deploy/docker-compose.yml up -d --build

# Restore DB từ bản backup gần nhất
LATEST=$(ls -t backups/stable_db_*.json | head -1 | xargs basename)
docker run --rm \
  -v cmms-stable-data:/data \
  -v "$(pwd)/backups":/backup \
  alpine:3 \
  cp /backup/$LATEST /data/db.json

# 4. Xác minh
bash deploy/scripts/healthcheck.sh
curl -s http://localhost:8080/api/health
```

Kết quả pass: API trả `{"ok":1}`, đăng nhập được, dữ liệu hiển thị đúng.

---

## Xử lý sự cố thường gặp

| Triệu chứng | Nguyên nhân | Xử lý |
|-------------|-------------|-------|
| Container không start | `SECRET_KEY` thiếu trong `.env` | Kiểm tra `env/stable.env` |
| API trả `401` sau restore | Cookie session cũ không còn hợp lệ | Xóa cookie trình duyệt, đăng nhập lại |
| `db.json` trống sau restore | Copy sai path | Kiểm tra lại lệnh `docker run` cp |
| Port 8080 bị chiếm | Tiến trình khác đang dùng | `lsof -i :8080` rồi kill |
| Volume không tồn tại | Chưa chạy `docker compose up` lần nào | Chạy `up -d` trước khi restore |

---

## Liên hệ hỗ trợ

- Architect: Antigravity – `trucdienhapulico@gmail.com`
- Repository: https://github.com/trucdienhapulico-ai/cmms-webapp
- Tài liệu vận hành: `deploy/docs/OPERATIONS.md`
