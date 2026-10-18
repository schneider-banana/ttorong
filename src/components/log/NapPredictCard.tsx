// 다음 낮잠 예측 카드 (홈 상단)
// - Huckleberry SweetSpot처럼 "다음 낮잠 예상 시간"을 보여줍니다.
// - 월령별 권장 wake window + 최근 실제 기록 블렌딩 (src/lib/napPredict.ts)
// - 무료 기능 (기록 습관 형성 유도)
import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { colors, radius } from "../../theme";
import type { BabyLogEntry, Child } from "../../types";
import {
  formatNapTime,
  formatWakeWindow,
  predictNextNap,
} from "../../lib/napPredict";

interface NapPredictCardProps {
  child: Child | null;
  /** 최근 수면 로그 (최신순, 넉넉히) */
  sleeps: BabyLogEntry[];
}

export function NapPredictCard({ child, sleeps }: NapPredictCardProps) {
  const prediction = useMemo(
    () => predictNextNap(child?.birthDate ?? null, sleeps),
    [child?.birthDate, sleeps]
  );

  if (!child) return null;

  let title = "";
  let subtitle = "";
  let icon: React.ComponentProps<typeof MaterialIcons>["name"] = "bedtime";

  if (prediction.state === "sleeping") {
    title = "자는 중이에요";
    subtitle = "깨면 다음 낮잠을 예상해 드릴게요";
    icon = "bedtime";
  } else if (prediction.state === "no-data") {
    title = "낮잠 예측 준비 중";
    subtitle = "수면을 2번 이상 기록하면 예상 시간을 알려드려요";
    icon = "schedule";
  } else {
    title = `다음 낮잠 예상 ${formatNapTime(prediction.at)}`;
    subtitle = prediction.personalized
      ? `우리 아이 패턴 기준 · 깨어있는 시간 약 ${formatWakeWindow(prediction.wakeWindowMin)}`
      : `월령 기준 권장 · 깨어있는 시간 약 ${formatWakeWindow(prediction.wakeWindowMin)}`;
    icon = "alarm";
  }

  return (
    <View style={styles.card}>
      <View style={[styles.iconWrap, { backgroundColor: colors.primarySoft }]}>
        <MaterialIcons name={icon} size={22} color={colors.primaryDeep} />
      </View>
      <View style={styles.textWrap}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    marginTop: 10,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  textWrap: { flex: 1 },
  title: { fontSize: 15, fontWeight: "800", color: colors.text },
  subtitle: { fontSize: 12, color: colors.textSoft, marginTop: 3, lineHeight: 17 },
});
