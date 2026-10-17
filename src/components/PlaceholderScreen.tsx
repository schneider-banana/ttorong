// "준비 중" 플레이스홀더 화면 (각 탭의 뼈대 UI)
import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

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
    backgroundColor: "#fff",
    paddingHorizontal: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 12,
  },
  badge: {
    backgroundColor: "#FFF3CD",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginBottom: 16,
  },
  badgeText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#856404",
  },
  description: {
    fontSize: 15,
    color: "#666",
    textAlign: "center",
    lineHeight: 22,
  },
});
