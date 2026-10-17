// 전역 에러 자동 보고
// - 앱에서 발생한 uncaught 에러를 Firestore의 errorReports 컬렉션에 기록합니다.
// - 개발자가 Firebase 콘솔(또는 API)에서 직접 확인할 수 있어,
//   테스터가 에러를 일일이 복사하지 않아도 됩니다.
// - 보고 자체가 실패해도 앱 동작에는 영향을 주지 않습니다 (best-effort).
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { firestoreDb, firebaseAuth } from "./firebase";

let installed = false;

/** 앱 시작 시 1회 호출 */
export function installErrorReporting(): void {
  if (installed) return;
  installed = true;
  try {
    const prev = ErrorUtils.getGlobalHandler();
    ErrorUtils.setGlobalHandler((error: unknown, isFatal?: boolean) => {
      void reportError(error, isFatal);
      if (prev) prev(error, isFatal);
    });
  } catch {
    // ErrorUtils를 사용할 수 없는 환경에서는 조용히 무시
  }
}

async function reportError(error: unknown, isFatal?: boolean): Promise<void> {
  try {
    if (!firestoreDb) return;
    const err = error as { message?: unknown; stack?: unknown } | null;
    await addDoc(collection(firestoreDb, "errorReports"), {
      message: String(err?.message ?? error ?? "unknown").slice(0, 2000),
      stack: String(err?.stack ?? "").slice(0, 4000),
      isFatal: isFatal ?? false,
      uid: firebaseAuth?.currentUser?.uid ?? null,
      createdAt: serverTimestamp(),
    });
  } catch {
    // 보고 실패는 무시 (무한 루프 방지)
  }
}
