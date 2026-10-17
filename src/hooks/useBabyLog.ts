// 육아 로그 훅: 로그 CRUD + 마지막 수유 경과시간 계산
// - 화면/컴포넌트는 useDatabase() 훅의 db 인터페이스만 통해 데이터에 접근합니다.
// - familyId/childId/createdBy는 로그인 세션(useAuth) + 현재 아이(useCurrentChild)에서
//   가져옵니다. 로그인 전·아이 미등록 상태에서는 빈 목록을 반환하고
//   저장 액션은 조용히 무시됩니다 (크래시 금지).
import { useCallback, useEffect, useMemo, useState } from "react";
import { useDatabase } from "./useDatabase";
import { useAuth } from "./useAuth";
import { useCurrentChild } from "./useCurrentChild";
import type { BabyLogEntry, BabyLogType } from "../types";

/** 기저귀 종류: 액션시트에서 소변/대변 선택 */
export type DiaperKind = "소변" | "대변";

/** 한 번에 불러오는 로그 최대 개수 (오늘 타임라인 + 마지막 수유 계산용) */
const LIST_LIMIT = 100;

/** ISO 시각이 오늘인지 (로컬 날짜 기준) */
function isToday(iso: string): boolean {
  const d = new Date(iso);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

/**
 * 마지막 수유 기준 시각: 종료된 수유는 종료 시각, 진행 중인 수유는 시작 시각.
 * "마지막 수유 ○시간 ○분 전" 계산의 기준점이 됩니다.
 */
export function feedingReferenceTime(entry: BabyLogEntry): string {
  return entry.endedAt ?? entry.startedAt;
}

/** 기준 시각으로부터의 경과 분수 (음수 방지) */
export function minutesSince(iso: string, now: Date = new Date()): number {
  return Math.max(
    0,
    Math.floor((now.getTime() - new Date(iso).getTime()) / 60000)
  );
}

/** 분수를 "○시간 ○분 전" / "○분 전" / "방금 전" 형식으로 표시 */
export function formatElapsed(minutes: number): string {
  if (minutes < 1) return "방금 전";
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}분 전`;
  return `${hours}시간 ${mins}분 전`;
}

/** 분수를 "35분" / "1시간 20분" 형식으로 표시 (진행 중 경과 표기용) */
export function formatDuration(minutes: number): string {
  if (minutes < 1) return "1분 미만";
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}분`;
  return `${hours}시간 ${mins}분`;
}

/** ISO 시각을 "오전 8:30" 형식으로 표시 */
export function formatClockTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("ko-KR", {
    hour: "numeric",
    minute: "2-digit",
  });
}

/** 진행 중인(종료 시각이 없는) 해당 종류 로그 찾기 */
function findActive(entries: BabyLogEntry[], type: BabyLogType): BabyLogEntry | null {
  return entries.find((e) => e.type === type && !e.endedAt) ?? null;
}

/** 새 로그의 공통 필드 (세션에서 결정 — 로그인 전·아이 미등록 시 null) */
interface LogContext {
  familyId: string;
  childId: string;
  createdBy: string;
}

/** 육아 로그 상태/액션을 제공하는 훅 */
export function useBabyLog() {
  const db = useDatabase();
  const { member, loading: authLoading } = useAuth();
  const { child, loading: childLoading } = useCurrentChild();
  /** 전체 로그 (최신순) */
  const [entries, setEntries] = useState<BabyLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  /** 연속 탭/중복 저장 방지용: 저장 작업 중에는 버튼 비활성화 */
  const [busy, setBusy] = useState(false);

  /** 인증 세션 + 아이 목록이 모두 확정됐는지 */
  const sessionReady = !authLoading && !childLoading;

  /** 세션 기반 로그 컨텍스트 (없으면 null) */
  const logContext: LogContext | null = useMemo(() => {
    if (!member || !child) return null;
    return {
      familyId: member.familyId,
      childId: child.id,
      createdBy: member.id,
    };
  }, [member, child]);

  /** 로그 다시 불러오기 (아이 없으면 빈 목록) */
  const reload = useCallback(async () => {
    if (!child) {
      setEntries([]);
      return;
    }
    const next = await db.listLogEntries(child.id, LIST_LIMIT);
    setEntries(next);
  }, [db, child]);

  /** 세션 확정 후 최초 로딩 (멤버·아이 변경 시에도 다시 로딩) */
  useEffect(() => {
    if (!sessionReady) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        await reload();
      } catch {
        if (!cancelled) setEntries([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionReady, reload]);

  /** 당겨서 새로고침 */
  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await reload();
    } finally {
      setRefreshing(false);
    }
  }, [reload]);

  /** 오늘의 기록 (타임라인 표시용, 최신순) */
  const todayEntries = useMemo(
    () => entries.filter((e) => isToday(e.startedAt)),
    [entries]
  );

  /** 진행 중인 수유/수면 */
  const activeFeeding = useMemo(() => findActive(entries, "feeding"), [entries]);
  const activeSleep = useMemo(() => findActive(entries, "sleep"), [entries]);

  /** 마지막 수유 (진행 중 포함) — 경과시간 헤더 계산용 */
  const lastFeeding = useMemo(
    () => entries.find((e) => e.type === "feeding") ?? null,
    [entries]
  );

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

  /** 수유 시작: 진행 중 로그 생성 */
  const startFeeding = useCallback(() => {
    if (!logContext) return Promise.resolve();
    const base = logContext;
    return mutate(() =>
      db
        .createLogEntry({
          ...base,
          type: "feeding",
          startedAt: new Date().toISOString(),
        })
        .then(() => undefined)
    );
  }, [db, logContext, mutate]);

  /**
   * 수유 종료: 진행 중 로그를 삭제하고 시작~종료가 완결된 한 쌍 로그로 교체.
   * (db 인터페이스에 update가 없어 delete+create로 처리)
   */
  const endFeeding = useCallback((amountMl?: number) => {
    const active = findActive(entries, "feeding");
    if (!active || !logContext) return Promise.resolve();
    const base = logContext;
    return mutate(async () => {
      await db.createLogEntry({
        ...base,
        type: "feeding",
        startedAt: active.startedAt,
        endedAt: new Date().toISOString(),
        note: active.note,
        ...(amountMl != null ? { amount: amountMl } : {}),
      });
      await db.deleteLogEntry(active.id);
    });
  }, [db, logContext, entries, mutate]);

  /** 수면 시작: 진행 중 로그 생성 */
  const startSleep = useCallback(() => {
    if (!logContext) return Promise.resolve();
    const base = logContext;
    return mutate(() =>
      db
        .createLogEntry({
          ...base,
          type: "sleep",
          startedAt: new Date().toISOString(),
        })
        .then(() => undefined)
    );
  }, [db, logContext, mutate]);

  /** 수면 종료: 진행 중 로그를 시작~종료 완결 로그로 교체 */
  const endSleep = useCallback(() => {
    const active = findActive(entries, "sleep");
    if (!active || !logContext) return Promise.resolve();
    const base = logContext;
    return mutate(async () => {
      await db.createLogEntry({
        ...base,
        type: "sleep",
        startedAt: active.startedAt,
        endedAt: new Date().toISOString(),
        note: active.note,
      });
      await db.deleteLogEntry(active.id);
    });
  }, [db, logContext, entries, mutate]);

  /** 기저귀: 탭 한 번에 즉시 기록 (종류는 note에 저장) */
  const logDiaper = useCallback(
    (kind: DiaperKind) => {
      if (!logContext) return Promise.resolve();
      const base = logContext;
      return mutate(() =>
        db
          .createLogEntry({
            ...base,
            type: "diaper",
            startedAt: new Date().toISOString(),
            note: kind,
          })
          .then(() => undefined)
      );
    },
    [db, logContext, mutate]
  );

  /** 체온: 숫자 입력 후 저장 (amount에 ℃ 수치 저장) */
  const logTemperature = useCallback(
    (value: number) => {
      if (!logContext) return Promise.resolve();
      const base = logContext;
      return mutate(() =>
        db
          .createLogEntry({
            ...base,
            type: "temperature",
            startedAt: new Date().toISOString(),
            amount: value,
          })
          .then(() => undefined)
      );
    },
    [db, logContext, mutate]
  );

  /** 로그 1건 삭제 */
  const deleteEntry = useCallback(
    (id: string) => mutate(() => db.deleteLogEntry(id).then(() => undefined)),
    [db, mutate]
  );

  return {
    entries,
    todayEntries,
    loading,
    refreshing,
    busy,
    activeFeeding,
    activeSleep,
    lastFeeding,
    refresh,
    startFeeding,
    endFeeding,
    startSleep,
    endSleep,
    logDiaper,
    logTemperature,
    deleteEntry,
  };
}
