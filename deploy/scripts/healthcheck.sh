#!/usr/bin/env bash
# Kiểm tra trạng thái hoạt động của tất cả services
set -euo pipefail

STABLE_URL="http://localhost:8080/api/health"
TEST_URL="http://localhost:8081/api/health"
PASS=0
FAIL=0

check() {
    local name="$1"
    local url="$2"
    local http_code
    http_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "$url" 2>/dev/null || echo "000")
    if [[ "$http_code" == "200" ]]; then
        echo "  [OK]  $name – $url"
        PASS=$((PASS+1))
    else
        echo "  [FAIL] $name – $url (HTTP $http_code)"
        FAIL=$((FAIL+1))
    fi
}

echo "=== CMMS Health Check $(date '+%Y-%m-%d %H:%M:%S') ==="
check "Stable (8080)" "$STABLE_URL"
check "Test   (8081)" "$TEST_URL"

echo ""
echo "Kết quả: $PASS OK / $FAIL FAIL"
[[ $FAIL -eq 0 ]] && exit 0 || exit 1
