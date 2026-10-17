// 데이터 레이어 접근 훅
// 화면에서는 이 훅을 통해 db 인터페이스만 사용합니다.
// mock → Firestore 전환 시에도 이 훅의 사용 코드는 바뀌지 않습니다.
import { db, type BabyLogDatabase } from "../lib/db";

export function useDatabase(): BabyLogDatabase {
  return db;
}
