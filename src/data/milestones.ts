// 발달 마일스톤 (0-24개월) — 번들 콘텐츠
// BabyTime 등 경쟁 앱이 제공하는 마일스톤 기록 기능용.
// 의학적 진단 기준이 아닌 일반적인 발달 참고용.

export interface Milestone {
  /** 고유 ID (DB 저장 키) */
  id: string;
  /** 마일스톤 이름 */
  title: string;
  /** 일반적인 달성 시기 (표시용) */
  ageLabel: string;
  /** 정렬용 기준 월령 */
  month: number;
  /** 카테고리 */
  category: "대근육" | "소근육" | "언어" | "사회성";
}

export const MILESTONES: Milestone[] = [
  { id: "social-smile", title: "사회적 미소 짓기", ageLabel: "1-2개월", month: 2, category: "사회성" },
  { id: "cooing", title: "옹알이 시작", ageLabel: "2-3개월", month: 3, category: "언어" },
  { id: "head-up", title: "엎드려서 목 가누기", ageLabel: "2-4개월", month: 3, category: "대근육" },
  { id: "grasp", title: "장난감 쥐기", ageLabel: "3-4개월", month: 4, category: "소근육" },
  { id: "rollover", title: "뒤집기", ageLabel: "4-6개월", month: 5, category: "대근육" },
  { id: "laugh", title: "소리 내어 웃기", ageLabel: "4-6개월", month: 5, category: "사회성" },
  { id: "sit-supported", title: "붙잡고 앉기", ageLabel: "5-7개월", month: 6, category: "대근육" },
  { id: "babbling", title: "마마·파파 옹알이", ageLabel: "6-8개월", month: 7, category: "언어" },
  { id: "sit-alone", title: "혼자 앉기", ageLabel: "6-8개월", month: 7, category: "대근육" },
  { id: "finger-food", title: "손으로 음식 집어먹기", ageLabel: "7-9개월", month: 8, category: "소근육" },
  { id: "crawl", title: "기어다니기", ageLabel: "7-10개월", month: 9, category: "대근육" },
  { id: "peekaboo", title: "까꿍 놀이 반응", ageLabel: "8-10개월", month: 9, category: "사회성" },
  { id: "pull-stand", title: "잡고 일어서기", ageLabel: "9-12개월", month: 10, category: "대근육" },
  { id: "pincer", title: "엄지·검지로 집기", ageLabel: "9-12개월", month: 10, category: "소근육" },
  { id: "bye-wave", title: "빠이 손 흔들기", ageLabel: "9-12개월", month: 11, category: "사회성" },
  { id: "first-word", title: "첫 단어 말하기", ageLabel: "10-14개월", month: 12, category: "언어" },
  { id: "cruise", title: "가구 잡고 옆으로 걷기", ageLabel: "11-13개월", month: 12, category: "대근육" },
  { id: "first-steps", title: "첫 걸음마", ageLabel: "12-15개월", month: 14, category: "대근육" },
  { id: "stack-blocks", title: "블록 2개 쌓기", ageLabel: "13-16개월", month: 15, category: "소근육" },
  { id: "point", title: "손가락으로 가리키기", ageLabel: "12-15개월", month: 14, category: "언어" },
  { id: "walk-well", title: "혼자 잘 걷기", ageLabel: "14-18개월", month: 16, category: "대근육" },
  { id: "two-words", title: "두 단어 조합 말하기", ageLabel: "18-24개월", month: 20, category: "언어" },
  { id: "scribble", title: "낙서하기", ageLabel: "15-18개월", month: 17, category: "소근육" },
  { id: "kick-ball", title: "공 차기", ageLabel: "18-24개월", month: 20, category: "대근육" },
  { id: "pretend-play", title: "상상 놀이 (전화 놀이 등)", ageLabel: "18-24개월", month: 21, category: "사회성" },
  { id: "run", title: "뛰기", ageLabel: "20-24개월", month: 22, category: "대근육" },
];

/** 월령 → 해당 시기 마일스톤 그룹핑용 */
export function milestonesForAge(months: number): Milestone[] {
  return MILESTONES.filter((m) => m.month <= months + 3).sort(
    (a, b) => a.month - b.month
  );
}
