// 하단 탭 네비게이션: 홈 / 캘린더 / 성장 / 설정
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import { colors } from "../../src/theme";

type IconName = ComponentProps<typeof Ionicons>["name"];

/** 탭별 아이콘 (선택됨 / 선택 안 됨) */
const TAB_ICONS: Record<string, [IconName, IconName]> = {
  index: ["home", "home-outline"],
  calendar: ["calendar", "calendar-outline"],
  growth: ["trending-up", "trending-up-outline"],
  settings: ["settings", "settings-outline"],
};

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.inactive,
        tabBarIcon: ({ focused, color, size }) => {
          const [active, inactive] = TAB_ICONS[route.name] ?? [
            "ellipse",
            "ellipse-outline",
          ];
          return (
            <Ionicons
              name={focused ? active : inactive}
              size={size}
              color={color}
            />
          );
        },
      })}
    >
      <Tabs.Screen name="index" options={{ title: "홈" }} />
      <Tabs.Screen name="calendar" options={{ title: "캘린더" }} />
      <Tabs.Screen name="growth" options={{ title: "성장" }} />
      <Tabs.Screen name="settings" options={{ title: "설정" }} />
    </Tabs>
  );
}
