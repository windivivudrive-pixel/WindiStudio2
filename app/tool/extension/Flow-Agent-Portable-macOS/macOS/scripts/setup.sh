#!/bin/bash
set -euo pipefail
. "$(cd "$(dirname "$0")" && pwd)/common.sh"

if [ "$(uname -s)" != Darwin ]; then red 'Script này chỉ dành cho macOS.'; exit 2; fi
printf 'FLOW AGENT PORTABLE - THIẾT LẬP macOS\n'
[ -f "$EXTENSION_ROOT/manifest.json" ] || { red 'Gói thiếu flow-extension.'; exit 2; }
command -v python3 >/dev/null 2>&1 || { red 'Cần Python 3.10+: https://www.python.org/downloads/macos/'; exit 2; }
python3 -c 'import sys; raise SystemExit(0 if sys.version_info >= (3,10) else 1)' || {
  red "Cần Python 3.10+, đang có $(python3 --version 2>&1)."; exit 2;
}
chrome="$(chrome_path || true)"
[ -n "$chrome" ] || { red 'Cần Google Chrome: https://www.google.com/chrome/'; exit 2; }

if [ ! -x "$VENV_PYTHON" ]; then
  printf 'Đang tạo môi trường Python riêng...\n'
  python3 -m venv "$APP_ROOT/.venv-portable"
fi
printf 'Đang cài/cập nhật dependency...\n'
"$VENV_PYTHON" -m pip install --disable-pip-version-check -e "$APP_ROOT"

old_url="$(config_value project_url 2>/dev/null || true)"
if [ -n "$old_url" ]; then
  printf 'Dán URL project Google Flow [Enter để giữ %s]: ' "$old_url"
else
  printf 'Dán URL project Google Flow: '
fi
IFS= read -r project_url
[ -n "$project_url" ] || project_url="$old_url"
project_id="$("$VENV_PYTHON" - "$project_url" <<'PY'
import re, sys
m=re.fullmatch(r"https://flow\.google\.com/project/([0-9a-fA-F-]{36})(?:[/?#].*)?", sys.argv[1].strip())
if not m: raise SystemExit(2)
print(m.group(1).lower())
PY
)" || { red 'URL phải có dạng https://flow.google.com/project/UUID'; exit 2; }
default_output="$(config_value default_output 2>/dev/null || true)"
[ -n "$default_output" ] || default_output="$HOME/Pictures/FlowAgent"
mkdir -p "$default_output"
"$VENV_PYTHON" - "$LOCAL_CONFIG" "$project_url" "$project_id" "$default_output" <<'PY'
import json, sys
with open(sys.argv[1], "w", encoding="utf-8") as handle:
    json.dump({"project_url":sys.argv[2],"project_id":sys.argv[3],"default_output":sys.argv[4]}, handle, ensure_ascii=False, indent=2)
PY
printf 'DEFAULT_PROJECT=%s\nFLOW_OUTPUT_DIR=%s\n' "$project_id" "$default_output" > "$APP_ROOT/.env"

chmod +x "$MAC_ROOT"/*.command "$SCRIPT_DIR"/*.sh
mkdir -p "$HOME/Library/LaunchAgents" "$MAC_ROOT/logs"
plist="$HOME/Library/LaunchAgents/com.flowagent.portable.plist"
"$VENV_PYTHON" - "$plist" "$SCRIPT_DIR/start-bridge.sh" "$MAC_ROOT/logs" <<'PY'
import plistlib, sys
data={"Label":"com.flowagent.portable","ProgramArguments":[sys.argv[2],"--quiet"],
      "RunAtLoad":True,"KeepAlive":False,
      "StandardOutPath":sys.argv[3]+"/launchagent.stdout.log",
      "StandardErrorPath":sys.argv[3]+"/launchagent.stderr.log"}
with open(sys.argv[1],"wb") as handle: plistlib.dump(data,handle)
PY
launchctl unload "$plist" >/dev/null 2>&1 || true
launchctl load "$plist"
"$SCRIPT_DIR/start-bridge.sh" --quiet || true

open -a 'Google Chrome' 'chrome://extensions/'
open "$EXTENSION_ROOT"
open -a 'Google Chrome' "$project_url"
green 'Đã cài dependency và LaunchAgent tự khởi động bridge.'
yellow 'Trong Chrome: Developer mode > Load unpacked > chọn:'
printf '%s\n' "$EXTENSION_ROOT"
yellow 'Đăng nhập Flow rồi chạy STATUS.command.'

