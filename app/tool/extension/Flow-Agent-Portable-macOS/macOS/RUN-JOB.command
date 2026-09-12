#!/bin/bash
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
job="${1:-}"
if [ -z "$job" ]; then
  printf 'Dán đường dẫn file job JSON: '
  IFS= read -r job
  job="${job#\"}"; job="${job%\"}"
fi
"$SCRIPT_DIR/scripts/run-job.sh" "$job"
status=$?
printf '\nNhấn Enter để đóng...'
read -r _
exit $status

