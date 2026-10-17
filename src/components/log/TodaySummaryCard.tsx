// 오늘 상태 요약 카드 (홈 상단 고정 영역용) — 베이비타임식 "패턴이 보임"
// - 1행: 마지막 수유 경과 ("마지막 수유 2시간 전" / "수유 중 (35분)")
// - 2행: 오늘 통계 3종 (수유 횟수 · 수면 횟수+총시간 · 기저귀 횟수)
// - 1분마다 경과시간 자동 갱신
import { useEffect, useMemo, useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { colors } from "../../theme";
import { icons } from "../../icons";
import type { BabyLogEntry } from "../../types";
import {
  feedingReferenceTime,
  formatElapsed,
  formatDuration,
  minutesSince,
} from "../../hooks/useBabyLog";

interface TodaySummaryCardProps {
  /** 오늘의 기록 (최신순) */
  entries: BabyLogEntry[];
}

export function TodaySummaryCard({ entries }: TodaySummaryCardProps) {
  // 1분마다 다시 렌더링 → 경과시간 실시간 갱신
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);

  const stats = useMemo(() => {
    const feedings = entries.filter((e) => e.type === "feeding");
    const sleeps = entries.filter((e) => e.type === "sleep");
    const diapers = entries.filter((e) => e.type === "diaper");
    const sleepMinutes = sleeps.reduce((sum, e) => {
      if (!e.endedAt) return sum;
      return sum + minutesSince(e.startedAt, new Date(e.endedAt));
    }, 0);
    return {
      feedingCount: feedings.length,
      sleepCount: sleeps.length,
      sleepMinutes,
      diaperCount: diapers.length,
      lastFeeding: feedings[0] ?? null,
    };
  }, [entries]);

  let feedingText = "수유 기록 없음";
  if (stats.lastFeeding) {
    const elapsed = formatElapsed(
      minutesSince(feedingReferenceTime(stats.lastFeeding), now)
    );
    feedingText = stats.lastFeeding.endedAt
      ? `마지막 수유 ${elapsed} 전`
      : `수유 중 (${elapsed})`;
  }

  return (
    <View style={styles.card}>
      {/* 1행: 마지막 수유 */}
      <View style={styles.topRow}>
        <Image source={{ uri: icons.Feeding }} style={styles.icon} />
        <Text style={styles.feedingText} numberOfLines={1}>
          {feedingText}
        </Text>
      </View>
      <View style={styles.hairline} />
      {/* 2행: 오늘 통계 */}
      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Image source={{ uri: icons.Feeding }} style={styles.statIcon} />
          <Text style={styles.statText}>수유 {stats.feedingCount}회</Text>
        </View>
        <View style={styles.stat}>
          <Image source={{ uri: icons.Sleep }} style={styles.statIcon} />
          <Text style={styles.statText}>
            수면 {stats.sleepCount}회
            {stats.sleepMinutes > 0
              ? ` · ${formatDuration(stats.sleepMinutes)}`
              : ""}
          </Text>
        </View>
        <View style={styles.stat}>
          <Image source={{ uri: icons.Diaper }} style={styles.statIcon} />
          <Text style={styles.statText}>기저귀 {stats.diaperCount}회</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.primarySoft,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  icon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    marginRight: 10,
  },
  feedingText: {
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
  },
  hairline: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 8,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  stat: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statIcon: {
    width: 26,
    height: 26,
    borderRadius: 8,
  },
  statText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textSoft,
  },
});
