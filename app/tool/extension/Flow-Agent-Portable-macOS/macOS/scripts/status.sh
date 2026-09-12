#!/bin/bash
set -u
. "$(cd "$(dirname "$0")" && pwd)/common.sh"
printf 'FLOW AGENT PORTABLE - TRẠNG THÁI macOS\n'
[ -x "$VENV_PYTHON" ] && printf 'Python env : OK\n' || printf 'Python env : THIẾU - chạy SETUP.command\n'
printf 'Extension  : %s\n' "$EXTENSION_ROOT"
if [ ! -x "$VENV_PYTHON" ]; then exit 2; fi
health="$(health_json || true)"
if [ -z "$health" ]; then
  yellow 'Bridge đang tắt; đang tự bật...'
  "$SCRIPT_DIR/start-bridge.sh" --quiet || true
  health="$(health_json || true)"
fi
if [ -z "$health" ]; then red 'Bridge: chưa chạy'; exit 3; fi
printf '%s' "$health" | "$VENV_PYTHON" -c '
import json,sys
h=json.load(sys.stdin)
print("Bridge     : Đang chạy")
print("Chrome     : " + ("Đã kết nối" if h.get("extension_connected") else "Chưa kết nối"))
print("Flow token : " + ("Đã nhận" if h.get("has_flow_key") else "Chưa nhận"))
raise SystemExit(0 if all(h.get(k) for k in ("extension_connected","has_flow_key")) else 4)
'
code=$?
if project_is_configured; then
  printf 'Project    : Đã cấu hình\n'
else
  printf 'Project    : Chưa cấu hình - chạy SETUP.command\n'
  code=4
fi
[ "$code" -eq 0 ] && green 'Sẵn sàng tạo media.' || yellow 'Mở Google Flow trong Chrome và kiểm tra extension/cấu hình.'
exit "$code"
