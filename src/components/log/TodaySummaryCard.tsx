// 오늘 상태 요약 카드 (홈 상단 고정 영역용)
// - "마지막 수유 ○시간 ○분 전" + "오늘 기록 N건"을 한 줄에 압축 표시
// - 1분마다 경과시간 자동 갱신
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors } from "../../theme";
import type { BabyLogEntry } from "../../types";
import {
  feedingReferenceTime,
  formatElapsed,
  minutesSince,
} from "../../hooks/useBabyLog";

interface TodaySummaryCardProps {
  /** 마지막 수유 기록 (없으면 null) */
  lastFeeding: BabyLogEntry | null;
  /** 오늘의 기록 건수 */
  entryCount: number;
}

export function TodaySummaryCard({
  lastFeeding,
  entryCount,
}: TodaySummaryCardProps) {
  // 1분마다 다시 렌더링 → 경과시간 실시간 갱신
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);

  let feedingText = "수유 기록 없음";
  if (lastFeeding) {
    const elapsed = formatElapsed(
      minutesSince(feedingReferenceTime(lastFeeding), now)
    );
    feedingText = lastFeeding.endedAt
      ? `마지막 수유 ${elapsed} 전`
      : `수유 중 (${elapsed})`;
  }

  return (
    <View style={styles.card}>
      <Text style={styles.icon}>🍼</Text>
      <Text style={styles.feedingText} numberOfLines={1}>
        {feedingText}
      </Text>
      <View style={styles.divider} />
      <Text style={styles.countText} numberOfLines={1}>
        오늘 {entryCount}건
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 64,
  },
  icon: {
    fontSize: 26,
    marginRight: 10,
  },
  feedingText: {
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
  },
  divider: {
    width: 1,
    height: 24,
    backgroundColor: colors.border,
    marginHorizontal: 12,
  },
  countText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.primaryDeep,
  },
});
