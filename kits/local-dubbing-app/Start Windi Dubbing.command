#!/bin/zsh
cd "${0:A:h}"
if ! command -v node >/dev/null 2>&1; then
  print 'Cần Node.js 20 trở lên. Cài Node rồi mở lại file này.'
  read -k 1
  exit 1
fi
node server.mjs &
windi_pid=$!
sleep 1
open "http://127.0.0.1:${LOCAL_DUBBING_PORT:-8787}/"
trap 'kill $windi_pid 2>/dev/null' INT TERM EXIT
wait $windi_pid
