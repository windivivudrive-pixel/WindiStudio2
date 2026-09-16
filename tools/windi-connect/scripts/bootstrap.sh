#!/bin/sh
set -eu
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
case "$(uname -s)-$(uname -m)" in
 Darwin-arm64) ARCH=arm64; SHA=b05aa3a66efe680023f930bd5af3fdbbd542794da5644ca2ad711d68cbd4dc35 ;;
 Darwin-x86_64) ARCH=x64; SHA=096081b6d6fcdd3f5ba0f5f1d44a47e83037ad2e78eada26671c252fe64dd111 ;;
 *) echo 'Hãy dùng bộ cài Windows trên Windows x64.'; exit 1 ;;
esac
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
printf '\nChọn trình duyệt: [1] Chrome [2] Cốc Cốc: '
read -r CHOICE
case "$CHOICE" in 1) BROWSER=chrome;; 2) BROWSER=coccoc;; *) exit 1;; esac
RELEASE_VERSION="$(sed -n 's/^[[:space:]]*\"version\":[[:space:]]*\"\([^\"]*\)\".*/\1/p' "$ROOT/package.json" | head -1)"
[ -n "$RELEASE_VERSION" ] || { echo 'Không đọc được version Windi.'; exit 1; }
RUNTIME="$HOME/Library/Application Support/WindiConnect/releases/$RELEASE_VERSION/runtime"
if ! "$RUNTIME/bin/node" -e 'if(process.version!=="v24.11.1")process.exit(1)' 2>/dev/null; then
  echo 'Đang tải Node cho Windi…'
  ARCHIVE="node-v24.11.1-darwin-$ARCH.tar.gz"
  curl --fail --location --retry 2 --silent --show-error "https://nodejs.org/dist/v24.11.1/$ARCHIVE" --output "$TMP/$ARCHIVE"
  printf '%s  %s\n' "$SHA" "$TMP/$ARCHIVE" | shasum -a 256 -c -
  tar -xzf "$TMP/$ARCHIVE" -C "$TMP"
  RUNTIME="$TMP/node-v24.11.1-darwin-$ARCH"
fi
"$RUNTIME/bin/node" --no-warnings "$ROOT/scripts/install.mjs" --runtime-root="$RUNTIME" --browser="$BROWSER"
printf '\nHoàn tất. Bật Developer mode và Load unpacked thư mục:\n%s\n' "$HOME/Library/Application Support/WindiConnect/extensions/windi"
