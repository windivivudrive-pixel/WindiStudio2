#!/bin/sh
set -e
BIN_DIR="$(CDPATH= cd -- "$(dirname -- "$0")/../node_modules/@remotion/compositor-darwin-arm64" && pwd)"
export DYLD_LIBRARY_PATH="$BIN_DIR${DYLD_LIBRARY_PATH:+:$DYLD_LIBRARY_PATH}"
exec "$BIN_DIR/ffmpeg" "$@"
