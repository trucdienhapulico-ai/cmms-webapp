#!/usr/bin/env bash
# Deploy bản Stable (port 8080) – rebuild image và restart container
# Tự động backup dữ liệu trước khi deploy
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMPOSE_FILE="$SCRIPT_DIR/../docker-compose.yml"

echo "[STABLE] Bắt đầu deploy bản Stable..."

# Backup dữ liệu trước khi deploy
echo "[STABLE] Backup dữ liệu trước khi deploy..."
bash "$SCRIPT_DIR/backup-stable.sh"

docker compose -f "$COMPOSE_FILE" build cmms-stable
docker compose -f "$COMPOSE_FILE" up -d --no-deps --force-recreate cmms-stable

echo "[STABLE] Chờ container khởi động..."
sleep 5

STATUS=$(docker compose -f "$COMPOSE_FILE" ps cmms-stable --format json 2>/dev/null \
    | grep -o '"Status":"[^"]*"' | head -1 || echo '"Status":"unknown"')
echo "[STABLE] Container status: $STATUS"

echo "[STABLE] Deploy hoàn tất. Truy cập: http://localhost:8080"
