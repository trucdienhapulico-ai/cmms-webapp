#!/usr/bin/env bash
# Xem logs của các container CMMS
# Cách dùng: ./logs.sh [stable|test|nginx|all] [-f]
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMPOSE_FILE="$SCRIPT_DIR/../docker-compose.yml"

TARGET="${1:-all}"
FOLLOW="${2:-}"

FOLLOW_FLAG=""
[[ "$FOLLOW" == "-f" ]] && FOLLOW_FLAG="--follow"

case "$TARGET" in
    stable)
        docker compose -f "$COMPOSE_FILE" logs $FOLLOW_FLAG --tail=100 cmms-stable
        ;;
    test)
        docker compose -f "$COMPOSE_FILE" logs $FOLLOW_FLAG --tail=100 cmms-test
        ;;
    nginx)
        docker compose -f "$COMPOSE_FILE" logs $FOLLOW_FLAG --tail=100 nginx
        ;;
    all|*)
        docker compose -f "$COMPOSE_FILE" logs $FOLLOW_FLAG --tail=50
        ;;
esac
