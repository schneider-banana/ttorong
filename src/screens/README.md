# src/screens

이 프로젝트는 Expo Router(file-based routing)를 사용하므로
실제 화면 파일은 `app/` 디렉터리 아래에 둡니다.

- `app/_layout.tsx` — 루트 레이아웃
- `app/(tabs)/_layout.tsx` — 하단 탭 네비게이션
- `app/(tabs)/index.tsx` — 홈/오늘
- `app/(tabs)/calendar.tsx` — 캘린더
- `app/(tabs)/log.tsx` — 육아 로그
- `app/(tabs)/settings.tsx` — 설정

`src/screens/` 는 라우트에 직접 연결되지 않는 화면 단위 컴포넌트
(예: 여러 라우트에서 재사용하는 큰 화면 조각)를 둘 때 사용합니다.
