#!/bin/sh
# 또롱이 에셋 복원 스크립트 (최초 클론 후 1회 실행)
#
# 배경: GitHub MCP로는 바이너리(PNG) 업로드가 안 돼서 아이콘 파일이 리포지토리에 없음.
# 이 스크립트가 또롱이 전용 아이콘(병아리 마스코트)을 다운로드한다.
# 링크는 Muse 내장 스토리지라 2026-10-19 이후 만료됨 — 만료 전에 받아두면
# 맥에 영구 저장되니 이후엔 필요 없음.
#
# 사용법: sh tools/restore-assets.sh

set -e
ASSETS_DIR="$(dirname "$0")/../assets"
mkdir -p "$ASSETS_DIR"
cd "$ASSETS_DIR"

download() {
  echo "다운로드: $1"
  curl -sSL -o "$1" "$2"
}

download "icon.png" "https://muse.ai/files/1429880630189995/1772499513967258/gxg8gb9yaw6i2tk0bq99f9mw/ttorong-icon.png"
download "android-icon-foreground.png" "https://muse.ai/files/1429880630189995/1120071797648948/hdpj8w5kwya39tytc43612c0/ttorong-android-foreground.png"
download "android-icon-background.png" "https://muse.ai/files/1429880630189995/1109947698554096/ll17b1sqmzwggyv6howvbgkb/ttorong-android-background.png"
download "android-icon-monochrome.png" "https://muse.ai/files/1429880630189995/1460221729505157/do2b3yguo9ej9ys4pqhvlg30/ttorong-android-monochrome.png"
download "favicon.png" "https://muse.ai/files/1429880630189995/1036568669404986/1qhhktitje1p5mrufw7098ud/ttorong-favicon.png"
download "splash-icon.png" "https://muse.ai/files/1429880630189995/1733972921010835/f437e7sl5acdr03l7yeoke4g/ttorong-splash.png"

echo "완료. assets/ 폴더 확인."
