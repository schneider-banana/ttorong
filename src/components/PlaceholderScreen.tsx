// "준비 중" 플레이스홀더 화면 (각 탭의 뼈대 UI)
import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors } from "../theme";

interface PlaceholderScreenProps {
  /** 화면 제목 */
  title: string;
  /** 화면 설명 문구 */
  description: string;
  /** 추가로 보여줄 내용 (선택) */
  children?: ReactNode;
}

export function PlaceholderScreen({
  title,
  description,
  children,
}: PlaceholderScreenProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.badge}>
        <Text style={styles.badgeText}>준비 중</Text>
      </View>
      <Text style={styles.description}>{description}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
    paddingHorizontal: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 12,
  },
  badge: {
    backgroundColor: colors.primarySoft,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginBottom: 16,
  },
  badgeText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.primaryDeep,
  },
  description: {
    fontSize: 15,
    color: colors.textSoft,
    textAlign: "center",
    lineHeight: 22,
  },
});
