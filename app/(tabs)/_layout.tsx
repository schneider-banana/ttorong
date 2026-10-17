// 하단 탭 네비게이션: 홈 / 캘린더 / 기록 / 성장 / 설정
import { Tabs } from "expo-router";

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" options={{ title: "홈" }} />
      <Tabs.Screen name="calendar" options={{ title: "캘린더" }} />
      <Tabs.Screen name="log" options={{ title: "기록" }} />
      <Tabs.Screen name="growth" options={{ title: "성장" }} />
      <Tabs.Screen name="settings" options={{ title: "설정" }} />
    </Tabs>
  );
}
