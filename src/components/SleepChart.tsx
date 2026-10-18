// 주간 수면 패턴 차트 (성장 탭)
// - BabyTime 리뷰에서 칭찬받는 "수면 차트"에 대응
// - 최근 7일 일별 총 수면시간 막대 그래프 (react-native-svg, 기존 설치됨)
// - 무료 기능
import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Rect, Text as SvgText } from "react-native-svg";
import { colors, radius } from "../theme";
import type { BabyLogEntry } from "../types";

interface SleepChartProps {
  /** 수면 로그 (넉넉히, 최신순 무관) */
  sleeps: BabyLogEntry[];
}

const W = 320;
const H = 150;
const PAD_L = 8;
const PAD_B = 22;
const PAD_T = 10;
const BAR_GAP = 8;

/** 로컬 YYYY-MM-DD */
function dayKey(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

export function SleepChart({ sleeps }: SleepChartProps) {
  const days = useMemo(() => {
    const result: { key: string; label: string; hours: number }[] = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const key = dayKey(d);
      const label = i === 0 ? "오늘" : `${d.getMonth() + 1}/${d.getDate()}`;
      result.push({ key, label, hours: 0 });
    }
    for (const e of sleeps) {
      if (e.type !== "sleep" || !e.endedAt) continue;
      const start = new Date(e.startedAt);
      const end = new Date(e.endedAt);
      // 수면 시간을 시작일 기준으로 집계 (밤잠이 다음날로 넘어가도 시작일에)
      const key = dayKey(start);
      const slot = result.find((r) => r.key === key);
      if (slot) {
        slot.hours += Math.max(0, (end.getTime() - start.getTime()) / 3600000);
      }
    }
    return result;
  }, [sleeps]);

  const maxHours = Math.max(12, ...days.map((d) => d.hours));
  const chartH = H - PAD_T - PAD_B;
  const chartW = W - PAD_L * 2;
  const barW = (chartW - BAR_GAP * 6) / 7;

  const total = days.reduce((a, d) => a + d.hours, 0);
  const avg = total / 7;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.cardTitle}>주간 수면 패턴</Text>
        <Text style={styles.sub}>하루 평균 {avg.toFixed(1)}시간</Text>
      </View>
      <Svg width={W} height={H}>
        {days.map((d, i) => {
          const h = Math.max(2, (d.hours / maxHours) * chartH);
          const x = PAD_L + i * (barW + BAR_GAP);
          const y = PAD_T + chartH - h;
          const isToday = i === 6;
          return (
            <React.Fragment key={d.key}>
              <Rect
                x={x}
                y={y}
                width={barW}
                height={h}
                rx={4}
                fill={isToday ? colors.primary : "#F5D9B8"}
              />
              <SvgText
                x={x + barW / 2}
                y={PAD_T + chartH + 15}
                fontSize={10}
                fill={colors.textSoft}
                textAnchor="middle"
              >
                {d.label}
              </SvgText>
              {d.hours > 0.05 && (
                <SvgText
                  x={x + barW / 2}
                  y={y - 4}
                  fontSize={9}
                  fill={colors.textSoft}
                  textAnchor="middle"
                >
                  {d.hours.toFixed(1)}
                </SvgText>
              )}
            </React.Fragment>
          );
        })}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginTop: 12,
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    marginBottom: 6,
  },
  cardTitle: { fontSize: 16, fontWeight: "800", color: colors.text },
  sub: { fontSize: 13, color: colors.textSoft },
});
