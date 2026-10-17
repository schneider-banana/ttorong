// 프리미엄 상태 조회
// - RevenueCat 구독 상태를 우선 확인
// - API Key 미설정(목 모드) 시 AsyncStorage 플래그로 폴백 (QA/개발용)
import AsyncStorage from "@react-native-async-storage/async-storage";
import { isPremiumActive } from "./purchases";

const PREMIUM_FLAG_KEY = "ttorong:premium";

/** 무료 플랜의 아이 등록 상한 */
export const FREE_CHILD_LIMIT = 1;

/** 프리미엄(유료 구독) 이용 중인지 */
export async function isPremium(): Promise<boolean> {
  try {
    if (await isPremiumActive()) return true;
  } catch {
    // RevenueCat 조회 실패 시 플래그로 폴백
  }
  return (await AsyncStorage.getItem(PREMIUM_FLAG_KEY)) === "1";
}

/** QA/개발용 프리미엄 플래그 설정 (스토어 심사 전 테스트용) */
export async function setPremiumFlag(on: boolean): Promise<void> {
  if (on) await AsyncStorage.setItem(PREMIUM_FLAG_KEY, "1");
  else await AsyncStorage.removeItem(PREMIUM_FLAG_KEY);
}
