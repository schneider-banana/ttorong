// 루트 레이아웃: Expo Router 스택 진입점
// - 로그인 상태에 따라 (auth) 그룹과 (tabs) 그룹 사이를 리다이렉트
import { useEffect, useState } from "react";
import { Stack, router, useSegments } from "expo-router";
import { useAuth } from "../src/hooks/useAuth";
import { installErrorReporting } from "../src/lib/errorReporting";
import { configurePurchases } from "../src/lib/purchases";

// 앱에서 발생한 uncaught 에러를 Firestore에 자동 보고 (개발자 확인용)
installErrorReporting();

// RevenueCat 결제 초기화 (API Key 없으면 목 모드)
void configurePurchases().catch(() => {});

export default function RootLayout() {
  const { isSignedIn, loading } = useAuth();
  const segments = useSegments();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (loading) return;
    const inAuthGroup = segments[0] === "(auth)";
    if (!isSignedIn && !inAuthGroup) {
      // 로그인 안 됐으면 인증 화면으로
      router.replace("/(auth)");
    } else if (isSignedIn && inAuthGroup) {
      // 로그인 됐으면 탭 화면으로
      router.replace("/(tabs)");
    }
    setReady(true);
  }, [isSignedIn, loading, segments]);

  // 세션 확인 전에는 아무것도 그리지 않아 화면 깜빡임을 방지
  if (loading || !ready) return null;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="(auth)" />
    </Stack>
  );
}
