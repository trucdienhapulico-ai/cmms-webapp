#!/usr/bin/env bash
# Deploy bản Test (port 8081) – rebuild image và restart container
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMPOSE_FILE="$SCRIPT_DIR/../docker-compose.yml"

echo "[TEST] Bắt đầu deploy bản Test..."

docker compose -f "$COMPOSE_FILE" build cmms-test
docker compose -f "$COMPOSE_FILE" up -d --no-deps --force-recreate cmms-test

echo "[TEST] Chờ container khởi động..."
sleep 5

STATUS=$(docker compose -f "$COMPOSE_FILE" ps cmms-test --format json 2>/dev/null \
    | grep -o '"Status":"[^"]*"' | head -1 || echo '"Status":"unknown"')
echo "[TEST] Container status: $STATUS"

echo "[TEST] Deploy hoàn tất. Truy cập: http://localhost:8081"
