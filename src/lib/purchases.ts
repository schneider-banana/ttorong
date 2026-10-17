/**
 * RevenueCat 결제 연동 (또롱이)
 *
 * TODO (출시 전):
 * 1. RevenueCat 계정 생성 → API Key 발급
 * 2. App Store Connect / Google Play Console에 상품 등록
 *    - 프리미엄 월 구독: 월 4,900원 (product: ttorong_premium_monthly)
 *    - 프리미엄 연 구독: 연 39,000원 (product: ttorong_premium_yearly)
 * 3. 아래 API_KEY에 실제 키 입력
 * 4. 실제 결제는 개발 빌드(EAS) 또는 스토어 빌드에서만 동작 (Expo Go에서는 목 모드)
 */
import { Platform } from "react-native";

// RevenueCat API Key (대시보드에서 발급) — 출시 전 입력
const API_KEY = Platform.select({
  ios: "REVENUECAT_IOS_API_KEY",
  android: "REVENUECAT_ANDROID_API_KEY",
  default: "",
}) as string;

export const PRODUCTS = {
  premiumMonthly: "ttorong_premium_monthly", // 월 4,900원
  premiumYearly: "ttorong_premium_yearly", // 연 39,000원
} as const;

export const ENTITLEMENT_PREMIUM = "premium";

let Purchases: any = null;
let mockMode = true;

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  Purchases = require("react-native-purchases").default;
  mockMode = true; // API Key 없으면 목 모드 (아래 configure에서 해제)
} catch {
  mockMode = true;
}

export function isMockMode(): boolean {
  return mockMode;
}

export async function configurePurchases(): Promise<void> {
  if (!Purchases) return;
  if (!API_KEY || API_KEY.includes("REVENUECAT")) {
    console.warn("[purchases] API Key 미설정 — 목 모드로 동작");
    mockMode = true;
    return;
  }
  mockMode = false;
  await Purchases.configure({ apiKey: API_KEY });
}

/** 프리미엄 구독 중인지 */
export async function isPremiumActive(): Promise<boolean> {
  if (mockMode || !Purchases) return false;
  try {
    const info = await Purchases.getCustomerInfo();
    return !!info.entitlements.active[ENTITLEMENT_PREMIUM];
  } catch {
    return false;
  }
}

/** 구매 실행 — 성공 시 true */
export async function purchaseProduct(productId: string): Promise<boolean> {
  if (mockMode || !Purchases) {
    console.warn("[purchases] 목 모드 — 실제 결제 없음");
    return false;
  }
  try {
    const offerings = await Purchases.getOfferings();
    const pkg = offerings.current?.availablePackages.find(
      (p: any) => p.product.identifier === productId
    );
    if (!pkg) return false;
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    return Object.keys(customerInfo.entitlements.active).length > 0;
  } catch (e: any) {
    if (!e.userCancelled) console.warn("[purchases] 구매 실패:", e);
    return false;
  }
}

/** 구매 복원 */
export async function restorePurchases(): Promise<boolean> {
  if (mockMode || !Purchases) return false;
  try {
    const info = await Purchases.restorePurchases();
    return Object.keys(info.entitlements.active).length > 0;
  } catch {
    return false;
  }
}
