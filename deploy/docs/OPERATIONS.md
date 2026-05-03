# CMMS – Hướng dẫn Vận hành

## Tổng quan môi trường

| Môi trường | URL              | Mục đích               |
|------------|------------------|------------------------|
| Stable     | http://HOST:8080 | Bản chạy thực tế       |
| Test       | http://HOST:8081 | Bản thử nghiệm tính năng mới |

Dữ liệu và biến môi trường của hai bản hoàn toàn tách biệt.

---

## Cấu trúc thư mục

```
cmms-webapp/
├── Dockerfile
├── deploy/
│   ├── docker-compose.yml
│   ├── nginx/nginx.conf
│   ├── scripts/
│   │   ├── deploy-stable.sh
│   │   ├── deploy-test.sh
│   │   ├── backup-stable.sh
│   │   ├── logs.sh
│   │   └── healthcheck.sh
│   └── docs/OPERATIONS.md
├── env/
│   ├── stable.env    # Biến môi trường Stable (KHÔNG commit)
│   └── test.env      # Biến môi trường Test  (KHÔNG commit)
└── backups/          # Backup tự động (tạo khi chạy deploy-stable)
```

---

## Khởi động lần đầu

```bash
# 1. Tạo file env (copy từ mẫu rồi chỉnh sửa)
mkdir -p env
cp env/stable.env.example env/stable.env   # chỉnh SECRET_KEY
cp env/test.env.example   env/test.env

# 2. Build và khởi động toàn bộ stack
cd deploy
docker compose up -d --build

# 3. Kiểm tra sức khoẻ
bash scripts/healthcheck.sh
```

---

## Deploy

### Deploy bản Test (an toàn – không ảnh hưởng Stable)
```bash
bash deploy/scripts/deploy-test.sh
```

### Deploy bản Stable (tự động backup trước khi deploy)
```bash
bash deploy/scripts/deploy-stable.sh
```

---

## Xem Logs

```bash
# Xem logs Stable (100 dòng cuối)
bash deploy/scripts/logs.sh stable

# Xem logs Test
bash deploy/scripts/logs.sh test

# Xem logs Nginx
bash deploy/scripts/logs.sh nginx

# Xem tất cả, theo dõi realtime
bash deploy/scripts/logs.sh all -f
```

---

## Backup dữ liệu

```bash
# Backup thủ công bản Stable
bash deploy/scripts/backup-stable.sh
```

- File backup lưu tại `backups/stable_db_YYYYMMDD_HHMMSS.json`.
- Tự động giữ lại 30 bản gần nhất, xóa bản cũ hơn.

---

## Kiểm tra sức khoẻ

```bash
bash deploy/scripts/healthcheck.sh
```

---

## Khởi động lại / Dừng

```bash
# Khởi động lại toàn bộ
docker compose -f deploy/docker-compose.yml restart

# Dừng toàn bộ
docker compose -f deploy/docker-compose.yml down

# Dừng và xóa volumes (XÓA DỮ LIỆU – thực hiện cẩn thận)
docker compose -f deploy/docker-compose.yml down -v
```

---

## File biến môi trường mẫu

**env/stable.env**
```
SECRET_KEY=change_me_stable_secret_key
NODE_ENV=production
```

**env/test.env**
```
SECRET_KEY=change_me_test_secret_key
NODE_ENV=test
```

> **Lưu ý:** Không commit file `env/*.env` vào git. Thêm `env/` vào `.gitignore`.
