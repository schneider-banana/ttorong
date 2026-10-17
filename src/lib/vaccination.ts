// 한국 표준 예방접종 일정 (0~24개월)
// - 질병관리청 국가예방접종 지원사업 표준 일정 기준 (2026년)
// - 병원/보건소 안내와 다를 수 있으니 접종 전 의료기관 확인 필요
// - 일정 상수는 이 파일에만 두고, 계산 로직은 순수 함수로 분리

/** 예방접종 1회차 정보 (상수) */
export interface VaccineDose {
  /** 백신명 (예: "B형간염") */
  vaccine: string;
  /** 차수 (예: "1차") */
  dose: string;
  /** 접종 권장 개월수 (생후) — 접종 예정일 = 생년월일 + dueMonth개월 */
  dueMonth: number;
  /** 접종 가능 시작 개월 (권장보다 이른 접종 불가 시 참고, 선택) */
  fromMonth?: number;
  /** 비고 */
  note?: string;
}

/**
 * 0~24개월 표준 예방접종 일정.
 * dueMonth 기준으로 오름차순 정렬되어 있음.
 */
export const VACCINATION_SCHEDULE: VaccineDose[] = [
  { vaccine: "BCG", dose: "1회", dueMonth: 0, note: "생후 4주 이내" },
  { vaccine: "B형간염", dose: "1차", dueMonth: 0, note: "출생 시" },
  { vaccine: "B형간염", dose: "2차", dueMonth: 1 },
  { vaccine: "DTaP", dose: "1차", dueMonth: 2, note: "디프테리아·파상풍·백일해" },
  { vaccine: "폴리오(IPV)", dose: "1차", dueMonth: 2 },
  { vaccine: "Hib", dose: "1차", dueMonth: 2, note: "b형 헤모필루스 인플루엔자" },
  { vaccine: "폐렴구균(PCV)", dose: "1차", dueMonth: 2 },
  { vaccine: "DTaP", dose: "2차", dueMonth: 4 },
  { vaccine: "폴리오(IPV)", dose: "2차", dueMonth: 4 },
  { vaccine: "Hib", dose: "2차", dueMonth: 4 },
  { vaccine: "폐렴구균(PCV)", dose: "2차", dueMonth: 4 },
  { vaccine: "B형간염", dose: "3차", dueMonth: 6 },
  { vaccine: "DTaP", dose: "3차", dueMonth: 6 },
  { vaccine: "폴리오(IPV)", dose: "3차", dueMonth: 6, note: "6~18개월" },
  { vaccine: "Hib", dose: "3차", dueMonth: 6 },
  { vaccine: "폐렴구균(PCV)", dose: "3차", dueMonth: 6 },
  { vaccine: "Hib", dose: "추가", dueMonth: 12, note: "12~15개월" },
  { vaccine: "폐렴구균(PCV)", dose: "추가", dueMonth: 12, note: "12~15개월" },
  { vaccine: "MMR", dose: "1차", dueMonth: 12, note: "홍역·유행성이하선염·풍진, 12~15개월" },
  { vaccine: "수두", dose: "1차", dueMonth: 12, note: "12~15개월" },
  { vaccine: "A형간염", dose: "1차", dueMonth: 12, note: "12~23개월" },
  { vaccine: "일본뇌염(사백신)", dose: "1차", dueMonth: 12, note: "12~23개월" },
  { vaccine: "일본뇌염(사백신)", dose: "2차", dueMonth: 13, note: "1차 접종 4주 후" },
  { vaccine: "DTaP", dose: "4차", dueMonth: 15, note: "15~18개월" },
  { vaccine: "A형간염", dose: "2차", dueMonth: 18, note: "1차 접종 6개월 후" },
];

/** 생년월일 기준 예방접종 1회분의 예정일 정보 */
export interface ScheduledDose extends VaccineDose {
  /** 접종 예정일 (YYYY-MM-DD) */
  dueDate: string;
}

/** "YYYY-MM-DD"에 개월수를 더한 날짜를 "YYYY-MM-DD"로 반환 */
export function addMonths(dateStr: string, months: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1 + months, d);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** 오늘 날짜를 "YYYY-MM-DD" (로컬 기준)로 반환 */
export function todayString(date: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** 아이 생년월일로 전체 접종 일정(예정일 포함) 계산 */
export function getVaccinationSchedule(birthDate: string): ScheduledDose[] {
  return VACCINATION_SCHEDULE.map((dose) => ({
    ...dose,
    dueDate: addMonths(birthDate, dose.dueMonth),
  }));
}

/** D-day 계산: 양수=남은 일수, 0=오늘, 음수=지난 일수 */
export function getDday(dueDate: string, today: string = todayString()): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  const due = new Date(`${dueDate}T00:00:00`);
  const now = new Date(`${today}T00:00:00`);
  return Math.round((due.getTime() - now.getTime()) / msPerDay);
}

/** D-day를 "D-12" / "D-Day" / "D+5" 형식으로 표시 */
export function formatDday(dday: number): string {
  if (dday === 0) return "D-Day";
  if (dday > 0) return `D-${dday}`;
  return `D+${-dday}`;
}

/** 접종 상태 */
export type DoseStatus = "done" | "upcoming" | "due" | "overdue";

/** 예정일 기준 상태 판정 (7일 이내면 due) */
export function getDoseStatus(dueDate: string, today: string = todayString()): DoseStatus {
  const dday = getDday(dueDate, today);
  if (dday < 0) return "overdue";
  if (dday <= 7) return "due";
  return "upcoming";
}

/** 상태 라벨 (한국어) */
export function doseStatusLabel(status: DoseStatus): string {
  switch (status) {
    case "done":
      return "접종 완료";
    case "due":
      return "접종 시기";
    case "overdue":
      return "지남";
    case "upcoming":
      return "예정";
  }
}

/** N일 이내에 예정된 접종만 추출 (기본 30일) */
export function getUpcomingDoses(
  birthDate: string,
  withinDays = 30,
  today: string = todayString()
): ScheduledDose[] {
  return getVaccinationSchedule(birthDate).filter((dose) => {
    const dday = getDday(dose.dueDate, today);
    return dday >= -30 && dday <= withinDays;
  });
}
