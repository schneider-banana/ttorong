// 캘린더 일정 종류별 라벨·색상 정의
// (기획: 예방접종=파랑, 병원=빨강, 어린이집=초록, 일반=회색)
import type { CalendarEventKind } from "../../types";

/** 일정 종류 메타 정보 */
export const EVENT_KIND_META: Record<
  CalendarEventKind,
  { label: string; color: string }
> = {
  vaccination: { label: "예방접종", color: "#2563eb" }, // 파랑
  hospital: { label: "병원", color: "#dc2626" }, // 빨강
  daycare: { label: "어린이집", color: "#16a34a" }, // 초록
  general: { label: "일반", color: "#6b7280" }, // 회색
};

/** 화면에 표시할 종류 순서 (입력 폼 선택지용) */
export const EVENT_KIND_ORDER: CalendarEventKind[] = [
  "vaccination",
  "hospital",
  "daycare",
  "general",
];

/** YYYY-MM-DD 형식으로 날짜 문자열 생성 */
export function toDateString(year: number, month: number, day: number): string {
  const mm = String(month).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${year}-${mm}-${dd}`;
}

/** 로컬 기준 오늘 날짜 (YYYY-MM-DD) */
export function todayString(): string {
  const now = new Date();
  return toDateString(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

/** 월의 첫날/마지막날 (YYYY-MM-DD) */
export function monthRange(year: number, month: number): {
  from: string;
  to: string;
} {
  const lastDay = new Date(year, month, 0).getDate(); // month는 1~12
  return {
    from: toDateString(year, month, 1),
    to: toDateString(year, month, lastDay),
  };
}

/** YYYY-MM-DD 형식 검증 */
export function isValidDateString(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return (
    dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d
  );
}

/** HH:mm 형식 검증 (빈 문자열이면 유효 = 입력 안 함) */
export function isValidTimeString(value: string): boolean {
  if (value === "") return true;
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}
