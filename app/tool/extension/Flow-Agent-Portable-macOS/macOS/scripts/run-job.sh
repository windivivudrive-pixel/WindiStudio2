#!/bin/bash
set -euo pipefail
. "$(cd "$(dirname "$0")" && pwd)/common.sh"
[ -n "${1:-}" ] || { red 'Thiếu đường dẫn job JSON.'; exit 2; }
"$SCRIPT_DIR/start-bridge.sh" --quiet
exec "$VENV_PYTHON" "$SCRIPT_DIR/job_runner.py" "$1"

