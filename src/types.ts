// babylog 핵심 데이터 모델
// 날짜/시간은 ISO 8601 문자열(예: "2026-10-17", "2026-10-17T08:30:00+09:00")로 저장합니다.

/** 아이 정보 */
export interface Child {
  /** 고유 ID */
  id: string;
  /** 아이 이름 */
  name: string;
  /** 생년월일 (YYYY-MM-DD) */
  birthDate: string;
  /** 성별 (성장 곡선 백분위용, 선택) */
  gender?: "male" | "female";
  /** 프로필 사진 URL (선택) */
  photoUrl?: string;
}

/** 가족 그룹 (초대코드로 연결되는 공유 단위) */
export interface Family {
  /** 고유 ID */
  id: string;
  /** 가족 이름 (예: "김가네") */
  name: string;
  /** 가족 초대 코드 (다른 멤버가 이 코드로 합류) */
  inviteCode: string;
  /** 소속 멤버 ID 목록 */
  memberIds: string[];
}

/** 멤버 역할 */
export type MemberRole = "parent" | "family";

/** 가족 구성원 */
export interface Member {
  /** 고유 ID */
  id: string;
  /** 표시 이름 */
  displayName: string;
  /** 역할: parent(부모) | family(가족) */
  role: MemberRole;
  /** 소속 가족 ID */
  familyId: string;
}

/** 일정 종류 */
export type CalendarEventKind =
  | "vaccination" // 예방접종
  | "hospital" // 병원 예약
  | "daycare" // 어린이집
  | "general"; // 일반 일정

/** 공유 가족 캘린더 일정 */
export interface CalendarEvent {
  /** 고유 ID */
  id: string;
  /** 소속 가족 ID */
  familyId: string;
  /** 일정 제목 */
  title: string;
  /** 날짜 (YYYY-MM-DD) */
  date: string;
  /** 시작 시각 (HH:mm, 선택) */
  startTime?: string;
  /** 종료 시각 (HH:mm, 선택) */
  endTime?: string;
  /** 담당자(당번) 멤버 ID (선택) */
  assigneeId?: string;
  /** 일정 종류 */
  kind: CalendarEventKind;
  /** 메모 (선택) */
  memo?: string;
}

/** 육아 로그 종류 */
export type BabyLogType =
  | "feeding" // 수유
  | "sleep" // 수면
  | "diaper" // 기저귀
  | "temperature"; // 체온

/** 육아 로그 한 건 (수유/수면/기저귀/체온 기록) */
export interface BabyLogEntry {
  /** 고유 ID */
  id: string;
  /** 소속 가족 ID */
  familyId: string;
  /** 대상 아이 ID */
  childId: string;
  /** 로그 종류 */
  type: BabyLogType;
  /** 시작 시각 (ISO 8601) */
  startedAt: string;
  /** 종료 시각 (수면 등, 선택) */
  endedAt?: string;
  /** 양/수치 (수유 ml, 체온 ℃ 등, 선택) */
  amount?: number;
  /** 메모 (선택) */
  note?: string;
  /** 기록한 멤버 ID */
  createdBy: string;
}

/**
 * 육아 로그 수정 패치
 * - endedAt: null → 종료시간 제거 (진행 중으로 되돌림)
 * - amount: null → 수치 제거
 * - note: null → 메모 제거
 */
export interface LogEntryPatch {
  startedAt?: string;
  endedAt?: string | null;
  amount?: number | null;
  note?: string | null;
}

/** 성장 기록 (키/몸무게/머리둘레 측정) */
export interface GrowthRecord {
  /** 고유 ID */
  id: string;
  /** 소속 가족 ID */
  familyId: string;
  /** 대상 아이 ID */
  childId: string;
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

/**
 * 발달 마일스톤 달성 기록 (아이당 1문서)
 * - 문서 ID = childId (families/{familyId}/milestones/{childId})
 * - achieved: 마일스톤 ID → 달성일 (YYYY-MM-DD)
 */
export interface MilestoneRecord {
  /** 대상 아이 ID (문서 ID와 동일) */
  childId: string;
  /** 마일스톤 ID → 달성일 */
  achieved: Record<string, string>;
}
