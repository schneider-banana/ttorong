# babylog — 가족 일정 공유 + 육아 로그 앱

React Native(Expo) + TypeScript + Firebase 기반 육아 앱 프로젝트입니다.
기획안(`plan-childcare-app.md`)의 기술 스택 결정을 따릅니다.

## 실행 방법

```bash
# 1. 의존성 설치
npm install

# 2. 개발 서버 실행 (Expo Go 앱 또는 에뮬레이터에서 확인)
npx expo start
```

- iOS 시뮬레이터: `npx expo start --ios` (macOS 필요)
- Android 에뮬레이터: `npx expo start --android`
- 웹: `npx expo start --web`

## 환경변수 설정 (Firebase)

1. `.env.example` 을 복사해 `.env` 파일을 만듭니다.
   ```bash
   cp .env.example .env
   ```
2. [Firebase 콘솔](https://console.firebase.google.com)에서 프로젝트를 만든 뒤,
   프로젝트 설정 > 일반 의 웹 앱 구성 값을 `.env` 에 채워 넣습니다.
3. `.env` 는 `.gitignore` 에 포함되어 있어 커밋되지 않습니다.

**Firebase 프로젝트가 아직 없어 키가 없다면:** `.env` 를 만들지 않아도 됩니다.
환경변수가 비어 있으면 앱이 자동으로 **인메모리 mock 모드**로 동작합니다
(설정 탭에서 현재 모드를 확인할 수 있습니다).
나중에 실제 키를 넣으면 코드 변경 없이 Firebase로 전환됩니다.
단, mock 모드의 데이터는 앱을 껐다 켜면 사라집니다.

## 프로젝트 구조

```
babylog/
├── app/                      # Expo Router (file-based routing) 화면
│   ├── _layout.tsx           # 루트 레이아웃
│   └── (tabs)/
│       ├── _layout.tsx       # 하단 탭 네비게이션 (홈/캘린더/기록/설정)
│       ├── index.tsx         # 홈/오늘
│       ├── calendar.tsx      # 캘린더 (공유 가족 일정)
│       ├── log.tsx           # 육아 로그 (원터치 기록)
│       └── settings.tsx      # 설정 (데이터 모드 표시 포함)
├── src/
│   ├── types.ts              # 핵심 데이터 인터페이스 (Child, Family, Member, CalendarEvent, BabyLogEntry)
│   ├── lib/
│   │   ├── firebase.ts       # Firebase 초기화 (env 없으면 mock 모드)
│   │   └── db.ts             # 데이터 레이어 인터페이스 + 인메모리 mock 구현체
│   ├── hooks/
│   │   └── useDatabase.ts    # 데이터 레이어 접근 훅
│   ├── components/
│   │   └── PlaceholderScreen.tsx  # "준비 중" 플레이스홀더 UI
│   └── screens/
│       └── README.md         # 화면 배치 규칙 설명 (실제 화면은 app/ 아래)
├── .env.example              # 필요한 환경변수 목록 (값은 YOUR_* 플레이스홀더)
├── app.json                  # Expo 설정
└── package.json
```

## 데이터 레이어 설명

- 화면/훅은 `src/lib/db.ts` 가 export 하는 `db` 객체(인터페이스 `BabyLogDatabase`)만 사용합니다.
- 현재는 Firebase 키가 없으므로 `InMemoryDatabase`(인메모리 mock)가 연결되어 있습니다.
- Firebase 프로젝트가 생기면 `FirestoreDatabase` 클래스의 TODO 메서드를 실제
  Firestore 호출(`addDoc`/`getDoc`/`setDoc`/`deleteDoc` 등)로 구현하고,
  보안 규칙(Firestore Security Rules)과 컬렉션 경로를 함께 설계하세요.

## 주의사항

- `EXPO_PUBLIC_` 접두사 환경변수는 클라이언트 번들에 포함되므로, Firebase 콘솔에서
  API 키 사용 제한을 설정하세요.
- Firestore 실시간 리스너를 설계할 때는 필요한 문서만 쿼리하세요.
  (무료 티어: 읽기 5만/일·쓰기 2만/일 — 잘못 설계하면 읽기 폭증)
- 스토어 심사: 개인정보처리방침 필수, 아이 사진은 미년자 개인정보로 취급
  (자세한 체크리스트는 기획안 7번 섹션 참고).

## 검증

```bash
npx tsc --noEmit              # 타입 체크
npx expo config --type public # Expo 설정 확인
```
