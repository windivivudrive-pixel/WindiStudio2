#!/bin/bash
set -u
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MAC_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
KIT_ROOT="$(cd "$MAC_ROOT/.." && pwd)"
APP_ROOT="$KIT_ROOT/flow-agent"
EXTENSION_ROOT="$KIT_ROOT/flow-extension"
VENV_PYTHON="$APP_ROOT/.venv-portable/bin/python3"
LOCAL_CONFIG="$MAC_ROOT/config.local.json"
FLOW_HEALTH_URL="http://127.0.0.1:8001/health"

red() { printf '\033[31m%s\033[0m\n' "$*"; }
green() { printf '\033[32m%s\033[0m\n' "$*"; }
yellow() { printf '\033[33m%s\033[0m\n' "$*"; }

chrome_path() {
  for path in "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
              "$HOME/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"; do
    [ -x "$path" ] && { printf '%s\n' "$path"; return 0; }
  done
  return 1
}

health_json() {
  curl --silent --show-error --max-time 2 "$FLOW_HEALTH_URL" 2>/dev/null
}

config_value() {
  [ -f "$LOCAL_CONFIG" ] || return 1
  "$VENV_PYTHON" - "$LOCAL_CONFIG" "$1" <<'PY'
import json, sys
with open(sys.argv[1], encoding="utf-8") as handle:
    value = json.load(handle).get(sys.argv[2], "")
print(value)
PY
}

project_is_configured() {
  [ -x "$VENV_PYTHON" ] || return 1
  [ -f "$LOCAL_CONFIG" ] || return 1
  "$VENV_PYTHON" - "$LOCAL_CONFIG" <<'PY'
import json, re, sys
try:
    with open(sys.argv[1], encoding="utf-8") as handle:
        config = json.load(handle)
    project_id = str(config.get("project_id", ""))
    project_url = str(config.get("project_url", ""))
    valid_id = re.fullmatch(r"[0-9a-fA-F-]{36}", project_id) is not None
    valid_url = project_url.startswith("https://flow.google.com/project/")
    raise SystemExit(0 if valid_id and valid_url else 1)
except (OSError, ValueError, TypeError):
    raise SystemExit(1)
PY
}
