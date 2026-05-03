#!/usr/bin/env bash
# Backup dữ liệu bản Stable vào thư mục backups/
set -euo pipefail

BACKUP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../../backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/stable_db_$TIMESTAMP.json"

mkdir -p "$BACKUP_DIR"

# Copy db.json từ volume ra ngoài qua container tạm
if docker volume inspect cmms-stable-data >/dev/null 2>&1; then
    docker run --rm \
        -v cmms-stable-data:/data \
        -v "$(realpath "$BACKUP_DIR")":/backup \
        alpine:3 \
        cp /data/db.json "/backup/stable_db_$TIMESTAMP.json"
    echo "[BACKUP] Đã lưu: $BACKUP_FILE"
else
    echo "[BACKUP] Volume cmms-stable-data chưa tồn tại, bỏ qua backup."
fi

# Giữ lại 30 bản backup gần nhất
ls -t "$BACKUP_DIR"/stable_db_*.json 2>/dev/null | tail -n +31 | xargs -r rm --
echo "[BACKUP] Dọn dẹp backup cũ hoàn tất."
