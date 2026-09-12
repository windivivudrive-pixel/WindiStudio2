#!/bin/bash
set -euo pipefail
. "$(cd "$(dirname "$0")" && pwd)/common.sh"
[ -x "$VENV_PYTHON" ] || { red 'Hãy chạy SETUP.command trước.'; exit 2; }
"$SCRIPT_DIR/start-bridge.sh" --quiet
exec "$VENV_PYTHON" "$SCRIPT_DIR/create_image.py"

