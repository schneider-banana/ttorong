#!/bin/sh
# 또롱이 에셋 복원 스크립트 (최초 클론 후 1회 실행)
#
# 배경: GitHub MCP로는 바이너리(PNG) 업로드가 안 돼서 아이콘 6개가 리포지토리에 없음.
# 이 스크립트가 Expo 기본 템플릿의 플레이스홀더 아이콘을 다운로드한다.
# (어차피 기본 Expo 아이콘이므로 개발 테스트용으로 충분. 스토어 제출 전 정식 아이콘으로 교체 예정)
#
# 사용법: sh tools/restore-assets.sh

set -e
BASE="https://raw.githubusercontent.com/expo/expo/sdk-58/templates/expo-template-default/assets/images"
ASSETS_DIR="$(dirname "$0")/../assets"
mkdir -p "$ASSETS_DIR"
cd "$ASSETS_DIR"

for f in icon.png splash-icon.png favicon.png android-icon-background.png android-icon-foreground.png android-icon-monochrome.png; do
  if [ -f "$f" ]; then
    echo "있음: $f (건너뜀)"
  else
    echo "다운로드: $f"
    curl -sSL -o "$f" "$BASE/$f"
  fi
done

echo "완료. assets/ 폴더 확인."
