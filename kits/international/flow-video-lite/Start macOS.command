#!/bin/sh
cd "$(dirname "$0")" || exit 1
node scripts/kit.mjs doctor
printf '\nAsk your AI agent to read skills/windi-flow-video-lite/SKILL.md.\nFirst installation: npm ci. Preview: npm run preview.\n'
printf 'Press Enter to close.'
read -r reply
