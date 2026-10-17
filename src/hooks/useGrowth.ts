// 성장 기록 훅: 성장 기록 CRUD
// - 화면은 useDatabase() 훅의 db 인터페이스만 통해 데이터에 접근합니다.
// - familyId/childId는 현재 아이(useCurrentChild)에서 가져옵니다.
//   로그인 전·아이 미등록 상태에서는 빈 목록을 반환하고
//   저장 액션은 조용히 무시됩니다 (크래시 금지).
import { useCallback, useEffect, useState } from "react";
import { useDatabase } from "./useDatabase";
import { useAuth } from "./useAuth";
import { useCurrentChild } from "./useCurrentChild";
import type { GrowthRecord } from "../types";

/** 새 성장 기록 입력값 */
export interface NewGrowthRecordInput {
  /** 측정일 (YYYY-MM-DD) */
  measuredDate: string;
  /** 키 (cm, 선택) */
  heightCm?: number;
  /** 몸무게 (kg, 선택) */
  weightKg?: number;
  /** 머리둘레 (cm, 선택) */
  headCm?: number;
  /** 메모 (선택) */
  note?: string;
}

/** 한 번에 불러오는 기록 최대 개수 */
const LIST_LIMIT = 200;

/** 성장 기록 상태/액션을 제공하는 훅 */
export function useGrowth() {
  const db = useDatabase();
  const { member } = useAuth();
  const { child, loading: childLoading } = useCurrentChild();
  /** 성장 기록 (측정일 오름차순) */
  const [records, setRecords] = useState<GrowthRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  /** 연속 탭/중복 저장 방지용: 저장 작업 중에는 버튼 비활성화 */
  const [busy, setBusy] = useState(false);

  /** 기록 다시 불러오기 (측정일 오름차순 정렬 보장, 아이 없으면 빈 목록) */
  const reload = useCallback(async () => {
    if (!child) {
      setRecords([]);
      return;
    }
    const next = await db.listGrowthRecords(child.id, LIST_LIMIT);
    next.sort((a, b) => a.measuredDate.localeCompare(b.measuredDate));
    setRecords(next);
  }, [db, child]);

  /** 아이 확정 후 최초 로딩 (아이 변경 시에도 다시 로딩) */
  useEffect(() => {
    if (childLoading) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        await reload();
      } catch {
        if (!cancelled) setRecords([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [childLoading, reload]);

  /** 당겨서 새로고침 */
  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await reload();
    } finally {
      setRefreshing(false);
    }
  }, [reload]);

  /** 공통 저장 래퍼: busy 처리 + 저장 후 목록 갱신 */
  const mutate = useCallback(
    async (work: () => Promise<void>) => {
      if (busy) return;
      setBusy(true);
      try {
        await work();
        await reload();
      } finally {
        setBusy(false);
      }
    },
    [busy, reload]
  );

  /** 성장 기록 1건 저장 (로그인 전·아이 미등록 시 무시) */
  const addRecord = useCallback(
    (input: NewGrowthRecordInput) => {
      if (!member || !child) return Promise.resolve();
      const familyId = member.familyId;
      const childId = child.id;
      return mutate(() =>
        db
          .createGrowthRecord({
            familyId,
            childId,
            measuredDate: input.measuredDate,
            // undefined 필드는 저장하지 않음 (Firestore undefined 저장 금지 대응)
            ...(input.heightCm !== undefined ? { heightCm: input.heightCm } : {}),
            ...(input.weightKg !== undefined ? { weightKg: input.weightKg } : {}),
            ...(input.headCm !== undefined ? { headCm: input.headCm } : {}),
            ...(input.note ? { note: input.note } : {}),
          })
          .then(() => undefined)
      );
    },
    [db, member, child, mutate]
  );

  /** 성장 기록 1건 삭제 */
  const deleteRecord = useCallback(
    (id: string) => mutate(() => db.deleteGrowthRecord(id)),
    [db, mutate]
  );

  return {
    records,
    loading,
    refreshing,
    busy,
    refresh,
    addRecord,
    deleteRecord,
  };
}
