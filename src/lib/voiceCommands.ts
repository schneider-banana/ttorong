// 한국어 음성 명령 파서 (목 STT 결과 텍스트 → 육아 로그 액션)
// - 공백을 무시하고 키워드 포함 여부로 판정합니다. (실제 STT 오탈자에 관대하게)
// - 해석이 애매하면 null을 반환 → 호출 측에서 "다시 말씀해주세요" 피드백을 줍니다.
import type { DiaperKind } from "../hooks/useBabyLog";

/** 음성 명령이 매핑되는 액션 종류 */
export type VoiceAction =
  | "startFeeding"
  | "endFeeding"
  | "startSleep"
  | "endSleep"
  | "diaper"
  | "temperature";

/** 파싱된 음성 명령 */
export interface VoiceCommand {
  action: VoiceAction;
  /** 기저귀 종류 ("기저귀 소변/대변" 처럼 종류가 명확할 때만 채워짐) */
  diaperKind?: DiaperKind;
  /** 체온 수치 (℃) */
  temperature?: number;
}

/**
 * "37도 5푼" → 37.5, "37.5도"/"37.5" → 37.5.
 * 숫자가 없거나 30~45℃ 범위를 벗어나면 null.
 */
function parseTemperatureValue(normalized: string): number | null {
  const withPun = normalized.match(/(\d+)도(\d+)푼/);
  let value: number;
  if (withPun) {
    // "37도 5푼" 형태: 정수부 + (푼 ÷ 10)
    value = parseInt(withPun[1], 10) + parseInt(withPun[2], 10) / 10;
  } else {
    const match = normalized.match(/(\d+(?:\.\d+)?)/);
    if (!match) return null;
    value = parseFloat(match[1]);
  }
  if (Number.isNaN(value) || value < 30 || value > 45) return null;
  return Math.round(value * 10) / 10;
}

/**
 * 음성 인식 텍스트를 육아 로그 액션으로 변환.
 * 해석 불가(키워드 없음, 기저귀 종류 없음 등)면 null.
 */
export function parseVoiceCommand(text: string): VoiceCommand | null {
  const normalized = text.replace(/\s+/g, "");
  if (normalized.length === 0) return null;

  // 체온: "체온 37.5도", "체온 37도 5푼"
  if (normalized.includes("체온")) {
    const temperature = parseTemperatureValue(normalized);
    if (temperature === null) return null;
    return { action: "temperature", temperature };
  }

  // 기저귀: "기저귀 소변", "기저귀 대변", "기저귀 쉬"
  if (normalized.includes("기저귀")) {
    if (normalized.includes("대변")) {
      return { action: "diaper", diaperKind: "대변" };
    }
    if (normalized.includes("소변") || normalized.includes("쉬")) {
      return { action: "diaper", diaperKind: "소변" };
    }
    return null; // 종류가 없으면 오기록 방지를 위해 판정 포기
  }

  // 수유: "수유 시작/스타트", "수유 끝/종료"
  if (normalized.includes("수유")) {
    if (normalized.includes("끝") || normalized.includes("종료")) {
      return { action: "endFeeding" };
    }
    if (normalized.includes("시작") || normalized.includes("스타트")) {
      return { action: "startFeeding" };
    }
    return null;
  }

  // 수면: "수면 시작/재우기", "수면 끝/일어났어"
  if (
    normalized.includes("수면") ||
    normalized.includes("재우") ||
    normalized.includes("잠") ||
    normalized.includes("일어났")
  ) {
    if (
      normalized.includes("끝") ||
      normalized.includes("종료") ||
      normalized.includes("일어났")
    ) {
      return { action: "endSleep" };
    }
    if (normalized.includes("시작") || normalized.includes("재우")) {
      return { action: "startSleep" };
    }
    return null;
  }

  return null;
}

/** 확인 다이얼로그용 문구 (예: "수유 시작으로 기록할까요?") */
export function describeCommand(cmd: VoiceCommand): string {
  switch (cmd.action) {
    case "startFeeding":
      return "수유 시작으로 기록할까요?";
    case "endFeeding":
      return "수유 종료로 기록할까요?";
    case "startSleep":
      return "수면 시작으로 기록할까요?";
    case "endSleep":
      return "수면 종료로 기록할까요?";
    case "diaper":
      return cmd.diaperKind
        ? `기저귀 ${cmd.diaperKind}으로 기록할까요?`
        : "기저귀 기록으로 기록할까요?";
    case "temperature":
      return cmd.temperature !== undefined
        ? `체온 ${cmd.temperature}℃로 기록할까요?`
        : "체온 기록으로 기록할까요?";
  }
}
