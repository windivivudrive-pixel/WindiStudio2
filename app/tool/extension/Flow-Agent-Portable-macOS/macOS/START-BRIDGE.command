#!/bin/bash
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
"$SCRIPT_DIR/scripts/start-bridge.sh"
status=$?
printf '\nNhấn Enter để đóng...'
read -r _
exit $status

