// 또롱이 디자인 시스템 — warm & soft (육아앱 톤)
// - 기본: 따뜻한 크림 배경 + 코랄 오렌지 포인트
// - 텍스트: 웜 블랙 / 웜 그레이 (차가운 #333/#999 대신)
// - 기록 종류별 틴트: 수유(피치) · 수면(페리윙클) · 기저귀(민트) · 체온(핑크)

export const colors = {
  /** 화면 배경 */
  background: "#FFFBF4",
  /** 카드 배경 */
  card: "#FFFFFF",
  /** 메인 포인트 (버튼·강조) */
  primary: "#FF8C42",
  /** primary 위 흰 글씨 대비용 진한 톤 */
  primaryDeep: "#D96C1E",
  /** 연한 포인트 틴트 (배경 장식용) */
  primarySoft: "#FFF1E2",
  /** 본문 텍스트 */
  text: "#332E29",
  /** 보조 텍스트 */
  textSoft: "#8A8175",
  /** 카드 테두리 */
  border: "#F1E7D6",
  /** 비활성 */
  inactive: "#B9B0A4",
  /** 위험 (삭제) */
  danger: "#E5484D",
  /** 기록 종류별 버튼 틴트 */
  tint: {
    feeding: "#FFE7D2",
    sleep: "#E1E9FB",
    diaper: "#DCF3E4",
    temperature: "#FFE0E8",
  },
  /** 일정 종류 색상 (의미 유지: 예방접종=파랑, 병원=빨강, 어린이집=초록, 일반=회색) */
  event: {
    vaccination: "#3B82F6",
    hospital: "#E5484D",
    daycare: "#22A35A",
    general: "#8A8175",
  },
} as const;

/** 공통 radius */
export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  round: 999,
} as const;
