// 다음 낮잠 예측 (SweetSpot-lite)
// - Huckleberry의 SweetSpot처럼 "다음 낮잠 예상 시간"을 알려줍니다.
// - 서버/AI 없이 온디바이스 계산: 월령별 권장 깨어있는 시간(wake window) +
//   최근 실제 수면 기록에서 구한 평균 wake window를 블렌딩.
// - 새 npm 패키지 없음, Expo Go 호환.

import type { BabyLogEntry } from "../types";

/** 월령별 권장 wake window (분). 소아 수면 가이드 기준 대략값. */
const WAKE_WINDOWS: { maxMonths: number; minutes: number }[] = [
  { maxMonths: 1, minutes: 55 }, // 0-1개월: 45-60분
  { maxMonths: 3, minutes: 75 }, // 1-3개월: 60-90분
  { maxMonths: 6, minutes: 105 }, // 3-6개월: 90분-2시간
  { maxMonths: 9, minutes: 135 }, // 6-9개월: 2-2.5시간
  { maxMonths: 12, minutes: 195 }, // 9-12개월: 3-3.5시간
  { maxMonths: 18, minutes: 270 }, // 12-18개월: 4-5시간
  { maxMonths: 24, minutes: 330 }, // 18-24개월: 5-6시간
  { maxMonths: 999, minutes: 360 }, // 24개월+: 6시간
];

/** 생년월일(YYYY-MM-DD) → 만 월령 */
export function ageInMonths(birthDate: string | null, now = new Date()): number | null {
  if (!birthDate) return null;
  const [y, m, d] = birthDate.split("-").map(Number);
  if (!y || !m || !d) return null;
  let months = (now.getFullYear() - y) * 12 + (now.getMonth() + 1 - m);
  if (now.getDate() < d) months -= 1;
  return Math.max(0, months);
}

/** 월령 → 권장 wake window (분) */
export function baseWakeWindow(months: number | null): number {
  if (months === null) return 150;
  for (const w of WAKE_WINDOWS) {
    if (months <= w.maxMonths) return w.minutes;
  }
  return 360;
}

/**
 * 최근 수면 기록에서 실제 wake window 평균 (분)을 구합니다.
 * wake window = 이전 수면 종료 → 다음 수면 시작 사이 간격.
 * 종료된 수면만 사용, 최근 7일 이내, 최대 10개 샘플.
 */
export function actualWakeWindowAvg(sleeps: BabyLogEntry[], now = new Date()): number | null {
  const done = sleeps
    .filter((e) => e.type === "sleep" && e.endedAt)
    .map((e) => ({
      start: new Date(e.startedAt).getTime(),
      end: new Date(e.endedAt as string).getTime(),
    }))
    .filter((s) => now.getTime() - s.end < 7 * 24 * 3600 * 1000)
    .sort((a, b) => a.start - b.start);
  if (done.length < 2) return null;
  const gaps: number[] = [];
  for (let i = 1; i < done.length && gaps.length < 10; i++) {
    const gapMin = (done[i].start - done[i - 1].end) / 60000;
    // 20분 미만(이어자기) / 12시간 초과(밤잠-낮잠 경계 오류)는 제외
    if (gapMin >= 20 && gapMin <= 12 * 60) gaps.push(gapMin);
  }
  if (gaps.length < 2) return null;
  return gaps.reduce((a, b) => a + b, 0) / gaps.length;
}

/** 예측에 쓴 wake window (분) + 데이터 기반 여부 */
export function predictWakeWindow(
  birthDate: string | null,
  sleeps: BabyLogEntry[]
): { minutes: number; personalized: boolean } {
  const months = ageInMonths(birthDate);
  const base = baseWakeWindow(months);
  const actual = actualWakeWindowAvg(sleeps);
  if (actual === null) return { minutes: base, personalized: false };
  // 실제 70% + 월령 기준 30% 블렌딩 (튀는 값 방지)
  return { minutes: Math.round(actual * 0.7 + base * 0.3), personalized: true };
}

export type NapPrediction =
  | { state: "sleeping" }
  | { state: "no-data" }
  | { state: "ready"; at: Date; personalized: boolean; wakeWindowMin: number };

/**
 * 다음 낮잠 예측.
 * - 현재 수면 중이면 sleeping
 * - 오늘 수면 기록이 하나도 없고 어제도 없으면 no-data (월령 가이드만 표시)
 */
export function predictNextNap(
  birthDate: string | null,
  sleeps: BabyLogEntry[],
  now = new Date()
): NapPrediction {
  const sorted = [...sleeps]
    .filter((e) => e.type === "sleep")
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  if (sorted.length === 0) return { state: "no-data" };
  const latest = sorted[0];
  if (!latest.endedAt) return { state: "sleeping" };
  const { minutes, personalized } = predictWakeWindow(birthDate, sleeps);
  const lastWake = new Date(latest.endedAt).getTime();
  // 마지막 기상이 18시간 넘게 지났으면 (어제 밤잠 등) 오늘 데이터 부족으로 판단
  if (now.getTime() - lastWake > 18 * 3600 * 1000) {
    return { state: "no-data" };
  }
  return {
    state: "ready",
    at: new Date(lastWake + minutes * 60000),
    personalized,
    wakeWindowMin: minutes,
  };
}

/** "오후 2:30" 형식 */
export function formatNapTime(d: Date): string {
  const h = d.getHours();
  const m = d.getMinutes();
  const ampm = h < 12 ? "오전" : "오후";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${ampm} ${h12}:${String(m).padStart(2, "0")}`;
}

/** 분 → "2시간 15분" 형식 */
export function formatWakeWindow(min: number): string {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  if (h === 0) return `${m}분`;
  if (m === 0) return `${h}시간`;
  return `${h}시간 ${m}분`;
}
