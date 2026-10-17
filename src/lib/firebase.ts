// Firebase 초기화
// EXPO_PUBLIC_FIREBASE_* 환경변수가 모두 채워져 있으면 Firebase에 연결되고,
// 하나라도 비어 있으면 자동으로 인메모리 mock 모드로 동작합니다.
// (.env에 실제 키를 넣으면 코드 변경 없이 Firebase로 전환됩니다.)
//
// React Native 환경 설정:
// - Auth: initializeAuth + getReactNativePersistence(AsyncStorage)로 세션 유지
//   (기본 getAuth는 RN에서 인메모리 세션이라 앱 재시작 시 로그아웃됨)
// - Firestore: initializeFirestore + persistentLocalCache로 오프라인 지속성
//   (네트워크 없이 기록해도 재접속 시 자동 동기화 — 기획안 6번 결정 사항)

import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import {
  initializeFirestore,
  getFirestore,
  persistentLocalCache,
  persistentSingleTabManager,
  type Firestore,
} from "firebase/firestore";
import {
  initializeAuth,
  getAuth,
  getReactNativePersistence,
  type Auth,
} from "firebase/auth";
import { getStorage, type FirebaseStorage } from "firebase/storage";
import ReactNativeAsyncStorage from "@react-native-async-storage/async-storage";

/** 환경변수 읽기: 빈 문자열/공백은 undefined 취급 */
function readEnv(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim().length > 0 ? value : undefined;
}

const apiKey = readEnv("EXPO_PUBLIC_FIREBASE_API_KEY");
const authDomain = readEnv("EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN");
const projectId = readEnv("EXPO_PUBLIC_FIREBASE_PROJECT_ID");
const storageBucket = readEnv("EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET");
const messagingSenderId = readEnv("EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID");
const appId = readEnv("EXPO_PUBLIC_FIREBASE_APP_ID");

/** true이면 Firebase 없이 인메모리 mock 모드로 동작 중 */
export const isMockMode: boolean = !(
  apiKey &&
  authDomain &&
  projectId &&
  storageBucket &&
  messagingSenderId &&
  appId
);

/** 현재 데이터 모드: "mock" | "firebase" */
export const firebaseMode: "mock" | "firebase" = isMockMode
  ? "mock"
  : "firebase";

let firebaseApp: FirebaseApp | null = null;
let firestoreDb: Firestore | null = null;
let firebaseAuth: Auth | null = null;
let firebaseStorage: FirebaseStorage | null = null;

if (isMockMode) {
  // 키가 없으면 경고를 남기고 null 인스턴스로 둡니다.
  // 데이터 레이어(src/lib/db.ts)는 이 경우 인메모리 구현체를 사용합니다.
  console.warn(
    "[babylog] Firebase 환경변수가 비어 있어 인메모리 mock 모드로 동작합니다. " +
      ".env에 EXPO_PUBLIC_FIREBASE_* 값을 채우면 자동으로 Firebase에 연결됩니다."
  );
} else {
  // initialize* 계열은 앱당 한 번만 호출해야 하므로 가드합니다.
  // (initializeFirestore는 getFirestore 호출 후에 설정을 바꿀 수 없어서
  //  처음부터 initializeFirestore로 생성합니다.)
  // Fast Refresh로 이 모듈이 재실행돼도 기존 인스턴스를 재사용합니다.
  if (getApps().length > 0) {
    firebaseApp = getApps()[0]!;
    firestoreDb = getFirestore(firebaseApp);
    firebaseAuth = getAuth(firebaseApp);
  } else {
    firebaseApp = initializeApp({
      apiKey: apiKey as string,
      authDomain: authDomain as string,
      projectId: projectId as string,
      storageBucket: storageBucket as string,
      messagingSenderId: messagingSenderId as string,
      appId: appId as string,
    });

    // Firestore 오프라인 지속성: RN에서는 AsyncStorage를 자동 사용합니다.
    // (모바일 앱은 단일 인스턴스이므로 persistentSingleTabManager)
    firestoreDb = initializeFirestore(firebaseApp, {
      localCache: persistentLocalCache({
        tabManager: persistentSingleTabManager(undefined),
      }),
    });

    // Auth 세션 지속성: AsyncStorage에 저장해 앱 재시작 후에도 로그인 유지
    firebaseAuth = initializeAuth(firebaseApp, {
      persistence: getReactNativePersistence(ReactNativeAsyncStorage),
    });
  }

  firebaseStorage = getStorage(firebaseApp);
}

export { firebaseApp, firestoreDb, firebaseAuth, firebaseStorage };
