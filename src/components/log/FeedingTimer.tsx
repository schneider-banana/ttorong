// 상단 헤더: "마지막 수유 ○시간 ○분 전" 크게 표시
// - 수유 기록 기준 실시간 계산, 1분마다 자동 갱신
// - 수유 진행 중이면 "수유 중" 뱃지와 시작 후 경과시간을 보여줍니다.
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import type { BabyLogEntry } from "../../types";
import {
  feedingReferenceTime,
  formatElapsed,
  minutesSince,
} from "../../hooks/useBabyLog";

interface FeedingTimerProps {
  /** 마지막 수유 기록 (진행 중 포함, 없으면 null) */
  lastFeeding: BabyLogEntry | null;
}

export function FeedingTimer({ lastFeeding }: FeedingTimerProps) {
  // 1분마다 다시 렌더링 → 경과시간이 실시간으로 갱신됨
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);

  const isActive = !!lastFeeding && !lastFeeding.endedAt;

  let headline = "아직 수유 기록이 없어요";
  if (lastFeeding) {
    const elapsed = formatElapsed(
      minutesSince(feedingReferenceTime(lastFeeding), now)
    );
    headline = isActive ? `수유 시작 ${elapsed}` : `마지막 수유 ${elapsed}`;
  }

  return (
    <View style={styles.card}>
      <Text style={styles.label}>마지막 수유</Text>
      <View style={styles.row}>
        <Text style={styles.headline}>{headline}</Text>
        {isActive && (
          <View style={styles.activeBadge}>
            <Text style={styles.activeBadgeText}>수유 중</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFF8F0",
    borderRadius: 20,
    padding: 24,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#FFE4C4",
  },
  label: {
    fontSize: 15,
    fontWeight: "600",
    color: "#B5651D",
    marginBottom: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 10,
  },
  headline: {
    fontSize: 30,
    fontWeight: "800",
    color: "#333",
    letterSpacing: -0.5,
  },
  activeBadge: {
    backgroundColor: "#FF8C42",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  activeBadgeText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#fff",
  },
});
