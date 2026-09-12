#!/bin/bash
set -euo pipefail
. "$(cd "$(dirname "$0")" && pwd)/common.sh"
quiet=0
[ "${1:-}" = "--quiet" ] && quiet=1

if [ ! -x "$VENV_PYTHON" ]; then
  red 'Thiếu môi trường Python. Hãy chạy SETUP.command.'
  exit 2
fi
if ! project_is_configured; then
  red 'Chưa cấu hình project. Hãy chạy SETUP.command.'
  exit 4
fi

# The upstream app reads these values from the process environment; it does
# not load .env by itself. Export them before starting a fresh backend.
export DEFAULT_PROJECT="$(config_value project_id)"
export FLOW_OUTPUT_DIR="$(config_value default_output)"
mkdir -p "$FLOW_OUTPUT_DIR"

health="$(health_json || true)"
if [ -z "$health" ]; then
  mkdir -p "$MAC_ROOT/logs"
  nohup "$VENV_PYTHON" "$APP_ROOT/main.py" \
    >"$MAC_ROOT/logs/bridge.stdout.log" 2>"$MAC_ROOT/logs/bridge.stderr.log" < /dev/null &
  for _ in $(seq 1 30); do
    sleep 0.5
    health="$(health_json || true)"
    [ -n "$health" ] && break
  done
fi
if [ -z "$health" ]; then
  red 'Không thể bật bridge tại 127.0.0.1:8001. Xem macOS/logs/bridge.stderr.log.'
  exit 3
fi

connected="$(printf '%s' "$health" | "$VENV_PYTHON" -c 'import json,sys; print(str(bool(json.load(sys.stdin).get("extension_connected"))).lower())')"
token="$(printf '%s' "$health" | "$VENV_PYTHON" -c 'import json,sys; print(str(bool(json.load(sys.stdin).get("has_flow_key"))).lower())')"
if [ "$connected" != true ] || [ "$token" != true ]; then
  url="$(config_value project_url || true)"
  chrome="$(chrome_path || true)"
  [ -n "$chrome" ] && [ -n "$url" ] && open -a 'Google Chrome' "$url" >/dev/null 2>&1 || true
  [ "$quiet" -eq 1 ] || yellow "Bridge đã bật; hãy mở Flow trong Chrome và kiểm tra extension: $EXTENSION_ROOT"
  exit 4
fi
[ "$quiet" -eq 1 ] || green 'Bridge và Chrome đã sẵn sàng.'
