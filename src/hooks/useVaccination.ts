// 예방접종 훅: 아이 생년월일 기준 접종 일정 계산 + 가족 캘린더 자동 등록
// - 일정 계산은 src/lib/vaccination.ts의 순수 함수만 사용 (상수는 읽기 전용)
// - familyId는 로그인 세션(useAuth)에서 가져옵니다.
//   로그인 전에는 syncToCalendar가 조용히 무시됩니다 (크래시 금지).
import { useCallback, useMemo } from "react";
import { useAuth } from "./useAuth";
import { useDatabase } from "./useDatabase";
import type { Child } from "../types";
import type { DoseStatus, ScheduledDose } from "../lib/vaccination";
import {
  getDday,
  getDoseStatus,
  getUpcomingDoses,
  getVaccinationSchedule,
  todayString,
} from "../lib/vaccination";

/** D-day·상태가 포함된 접종 일정 항목 */
export interface EnrichedDose extends ScheduledDose {
  /** D-day: 양수=남은 일수, 0=오늘, 음수=지난 일수 */
  dday: number;
  /** 접종 상태 (접종 완료/접종 시기/지남/예정) */
  status: DoseStatus;
}

/** 자동 등록 이벤트 식별 태그 (멱등 보장용, memo에 기록) */
export const AUTO_VACCINATION_TAG = "[자동] 예방접종";

export function useVaccination(child: Child | null) {
  const db = useDatabase();
  const { member } = useAuth();
  /** 로그인된 가족 ID (없으면 null — 자동 등록은 조용히 무시) */
  const familyId = member?.familyId ?? null;
  const today = useMemo(() => todayString(), []);

  /** 전체 일정 + dueDate/D-day/status */
  const schedule: EnrichedDose[] = useMemo(() => {
    if (!child) return [];
    return getVaccinationSchedule(child.birthDate).map((dose) => ({
      ...dose,
      dday: getDday(dose.dueDate, today),
      status: getDoseStatus(dose.dueDate, today),
    }));
  }, [child, today]);

  /** 30일 이내 다가오는 접종 (getUpcomingDoses 기준) */
  const upcoming: EnrichedDose[] = useMemo(() => {
    if (!child) return [];
    return getUpcomingDoses(child.birthDate, 30, today).map((dose) => ({
      ...dose,
      dday: getDday(dose.dueDate, today),
      status: getDoseStatus(dose.dueDate, today),
    }));
  }, [child, today]);

  /** 지난 접종 */
  const overdue: EnrichedDose[] = useMemo(() => {
    return schedule.filter((dose) => dose.status === "overdue");
  }, [schedule]);

  /**
   * 가족 캘린더에 예방접종 일정을 자동 등록한다.
   * - 멱등 보장: memo에 자동 태그가 있고 같은 백신+차수(title)인
   *   이벤트가 이미 있으면 스킵한다.
   * - NOTE: 아이가 여러 명이면 같은 백신+차수 title이 겹쳐 스킵될 수 있다.
   *   (현재 UI는 첫 번째 아이 1명만 다루므로 스펙대로 title 비교)
   */
  const syncToCalendar = useCallback(async (): Promise<{
    created: number;
    skipped: number;
  }> => {
    if (!child || !familyId) return { created: 0, skipped: 0 };
    const doses = getVaccinationSchedule(child.birthDate);
    if (doses.length === 0) return { created: 0, skipped: 0 };

    // 전체 일정을 커버하는 날짜 범위로 기존 일정 조회
    const dates = doses.map((dose) => dose.dueDate).sort();
    const existing = await db.listEvents(familyId, dates[0], dates[dates.length - 1]);

    // 이미 자동 등록된 접종 (같은 백신+차수 title)
    const syncedTitles = new Set(
      existing
        .filter((event) => (event.memo ?? "").includes(AUTO_VACCINATION_TAG))
        .map((event) => event.title.trim())
    );

    let created = 0;
    let skipped = 0;
    for (const dose of doses) {
      const title = `${dose.vaccine} ${dose.dose}`;
      if (syncedTitles.has(title)) {
        skipped++;
        continue;
      }
      await db.createEvent({
        familyId,
        title,
        date: dose.dueDate,
        kind: "vaccination",
        memo: `${AUTO_VACCINATION_TAG}\n${dose.note ?? ""}`,
      });
      syncedTitles.add(title);
      created++;
    }
    return { created, skipped };
  }, [db, child, familyId]);

  return { schedule, upcoming, overdue, syncToCalendar };
}
