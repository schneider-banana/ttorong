// 성장 곡선 차트 (WHO 백분위 곡선 + 아이 측정 점)
// - 0~24개월, P3/P15/P50/P85/P97, 키·몸무게 토글, 남아·여아 토글
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Line, Path, Text as SvgText } from "react-native-svg";
import { colors } from "../theme";
import {
  getPercentileCurves,
  type WhoIndicator,
  type WhoSex,
} from "../data/whoGrowth";
import type { GrowthRecord } from "../types";

const W = 340;
const H = 250;
const PAD = { left: 38, right: 10, top: 12, bottom: 28 };
const MAX_MONTH = 24;
const DAYS_PER_MONTH = 30.4375;

/** 측정일을 월령(개월, 소수)으로 변환. 계산 불가하면 null */
function monthsSince(birthDate: string, measuredDate: string): number | null {
  const b = new Date(`${birthDate}T00:00:00`);
  const m = new Date(`${measuredDate}T00:00:00`);
  if (Number.isNaN(b.getTime()) || Number.isNaN(m.getTime())) return null;
  return (m.getTime() - b.getTime()) / (86_400_000 * DAYS_PER_MONTH);
}

/** 보기 좋은 y축 눈금 계산 */
function niceTicks(min: number, max: number, count = 4): number[] {
  if (!(max > min)) return [min];
  const raw = (max - min) / count;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const norm = raw / mag;
  const step = (norm < 1.5 ? 1 : norm < 3.5 ? 2 : norm < 7.5 ? 5 : 10) * mag;
  const ticks: number[] = [];
  for (let v = Math.ceil(min / step) * step; v <= max + 1e-9; v += step) {
    ticks.push(Number(v.toFixed(2)));
  }
  return ticks.length > 0 ? ticks : [Number(min.toFixed(1))];
}

interface Point {
  x: number;
  y: number;
}

export function GrowthChart({
  records,
  birthDate,
}: {
  records: GrowthRecord[];
  birthDate: string | null;
}) {
  const [indicator, setIndicator] = useState<WhoIndicator>("lhfa");
  const [sex, setSex] = useState<WhoSex>("male");

  const curves = useMemo(
    () => getPercentileCurves(indicator, sex),
    [indicator, sex]
  );

  /** 차트에 찍을 아이 측정 점 (월령 0~24개월 이내만) */
  const points: Point[] = useMemo(() => {
    if (!birthDate) return [];
    const getValue = (r: GrowthRecord) =>
      indicator === "lhfa" ? r.heightCm : r.weightKg;
    return records
      .map((r) => {
        const mo = monthsSince(birthDate, r.measuredDate);
        const v = getValue(r);
        if (mo === null || v === undefined || mo < 0 || mo > MAX_MONTH)
          return null;
        return { x: mo, y: v };
      })
      .filter((p): p is Point => p !== null)
      .sort((a, b) => a.x - b.x);
  }, [records, birthDate, indicator]);

  const yValues = useMemo(() => {
    const vals: number[] = [];
    for (const c of curves) vals.push(...c.values);
    for (const p of points) vals.push(p.y);
    return vals;
  }, [curves, points]);

  const { paths, band, yTicks, xOf, yOf } = useMemo(() => {
    let lo = Math.min(...yValues);
    let hi = Math.max(...yValues);
    const pad = (hi - lo) * 0.08 || 1;
    lo -= pad;
    hi += pad;
    const xOf = (mo: number) =>
      PAD.left + (mo / MAX_MONTH) * (W - PAD.left - PAD.right);
    const yOf = (v: number) =>
      PAD.top + (1 - (v - lo) / (hi - lo)) * (H - PAD.top - PAD.bottom);
    const toPath = (vals: number[]) =>
      vals
        .map((v, i) => `${i === 0 ? "M" : "L"}${xOf(i).toFixed(1)},${yOf(v).toFixed(1)}`)
        .join(" ");
    // curves[].values = [P3, P15, P50, P85, P97]
    const paths = [0, 1, 2, 3, 4].map((k) =>
      toPath(curves.map((c) => c.values[k]))
    );
    // P3~P97 밴드
    const top = curves.map((c, i) => `${i === 0 ? "M" : "L"}${xOf(i).toFixed(1)},${yOf(c.values[4]).toFixed(1)}`).join(" ");
    const bottom = [...curves]
      .reverse()
      .map((c, i) => `L${xOf(MAX_MONTH - i).toFixed(1)},${yOf(c.values[0]).toFixed(1)}`)
      .join(" ");
    return {
      paths,
      band: `${top} ${bottom} Z`,
      yTicks: niceTicks(lo, hi),
      xOf,
      yOf,
    };
  }, [curves, yValues]);

  const unit = indicator === "lhfa" ? "cm" : "kg";
  const xTicks = [0, 6, 12, 18, 24];

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>성장 곡선</Text>
          <Text style={styles.subtitle}>
            WHO 백분위 기준 · 0~24개월 · 단위 {unit}
          </Text>
        </View>
      </View>

      {/* 지표 토글 */}
      <View style={styles.toggleRow}>
        {(
          [
            { key: "lhfa", label: "키" },
            { key: "wfa", label: "몸무게" },
          ] as const
        ).map((o) => (
          <Pressable
            key={o.key}
            style={[styles.toggle, indicator === o.key && styles.toggleActive]}
            onPress={() => setIndicator(o.key)}
          >
            <Text
              style={[
                styles.toggleText,
                indicator === o.key && styles.toggleTextActive,
              ]}
            >
              {o.label}
            </Text>
          </Pressable>
        ))}
        <View style={styles.toggleGap} />
        {(
          [
            { key: "male", label: "남아" },
            { key: "female", label: "여아" },
          ] as const
        ).map((o) => (
          <Pressable
            key={o.key}
            style={[styles.toggle, sex === o.key && styles.toggleActive]}
            onPress={() => setSex(o.key)}
          >
            <Text
              style={[
                styles.toggleText,
                sex === o.key && styles.toggleTextActive,
              ]}
            >
              {o.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* 차트 */}
      <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`}>
        {/* y 그리드 */}
        {yTicks.map((t) => (
          <Line
            key={t}
            x1={PAD.left}
            x2={W - PAD.right}
            y1={yOf(t)}
            y2={yOf(t)}
            stroke={colors.border}
            strokeWidth={1}
          />
        ))}
        {/* P3~P97 밴드 */}
        <Path d={band} fill={colors.primarySoft} opacity={0.55} />
        {/* 백분위 곡선: P3/P97 연하게, P15/P85 중간, P50 진하게 */}
        {paths.map((d, k) => (
          <Path
            key={k}
            d={d}
            fill="none"
            stroke={k === 2 ? colors.primaryDeep : k === 1 || k === 3 ? colors.textSoft : colors.inactive}
            strokeWidth={k === 2 ? 2.2 : 1.2}
            strokeDasharray={k === 2 ? undefined : "5,4"}
          />
        ))}
        {/* 아이 측정 점 */}
        {points.length > 1 && (
          <Path
            d={points.map((p, i) => `${i === 0 ? "M" : "L"}${xOf(p.x).toFixed(1)},${yOf(p.y).toFixed(1)}`).join(" ")}
            fill="none"
            stroke={colors.primary}
            strokeWidth={1.6}
            opacity={0.7}
          />
        )}
        {points.map((p, i) => (
          <Circle
            key={i}
            cx={xOf(p.x)}
            cy={yOf(p.y)}
            r={4}
            fill={colors.primary}
            stroke="#fff"
            strokeWidth={1.5}
          />
        ))}
        {/* y축 눈금 */}
        {yTicks.map((t) => (
          <SvgText
            key={t}
            x={PAD.left - 6}
            y={yOf(t) + 3.5}
            fontSize={9.5}
            fill={colors.textSoft}
            textAnchor="end"
          >
            {t}
          </SvgText>
        ))}
        {/* x축 눈금 */}
        {xTicks.map((m) => (
          <SvgText
            key={m}
            x={xOf(m)}
            y={H - 8}
            fontSize={9.5}
            fill={colors.textSoft}
            textAnchor="middle"
          >
            {m === 24 ? "24개월" : `${m}`}
          </SvgText>
        ))}
      </Svg>

      {/* 범례 */}
      <View style={styles.legend}>
        <Svg width={26} height={10}>
          <Line x1={0} x2={26} y1={5} y2={5} stroke={colors.primaryDeep} strokeWidth={2.2} />
        </Svg>
        <Text style={styles.legendText}>P50</Text>
        <Svg width={26} height={10}>
          <Line x1={0} x2={26} y1={5} y2={5} stroke={colors.textSoft} strokeWidth={1.2} strokeDasharray="5,4" />
        </Svg>
        <Text style={styles.legendText}>P15·P85</Text>
        <Svg width={26} height={10}>
          <Line x1={0} x2={26} y1={5} y2={5} stroke={colors.inactive} strokeWidth={1.2} strokeDasharray="5,4" />
        </Svg>
        <Text style={styles.legendText}>P3·P97</Text>
        {points.length > 0 && (
          <>
            <View style={styles.dot} />
            <Text style={styles.legendText}>우리 아이</Text>
          </>
        )}
      </View>

      {!birthDate && (
        <Text style={styles.hint}>
          아이 생년월일이 없어 월령을 계산할 수 없습니다. 설정에서 아이
          정보를 입력해 주세요.
        </Text>
      )}
      {birthDate && points.length === 0 && (
        <Text style={styles.hint}>
          측정 기록이 없거나 24개월을 넘었습니다. 측정을 기록하면 점으로
          표시됩니다.
        </Text>
      )}

      <Text style={styles.disclaimer}>
        WHO 아동 성장 표준 기반 참고용 간이 곡선입니다. 정확한 백분위
        판정·진단은 소아청소년과에서 받으세요.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  title: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.text,
  },
  subtitle: {
    fontSize: 12,
    color: colors.textSoft,
    marginTop: 2,
  },
  toggleRow: {
    flexDirection: "row",
    marginBottom: 8,
  },
  toggle: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 6,
  },
  toggleActive: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  toggleText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textSoft,
  },
  toggleTextActive: {
    color: colors.primaryDeep,
    fontWeight: "700",
  },
  toggleGap: {
    width: 10,
  },
  legend: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
    flexWrap: "wrap",
  },
  legendText: {
    fontSize: 11,
    color: colors.textSoft,
    marginLeft: 4,
    marginRight: 10,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    marginLeft: 2,
  },
  hint: {
    fontSize: 13,
    color: colors.textSoft,
    marginTop: 10,
    lineHeight: 19,
  },
  disclaimer: {
    fontSize: 11.5,
    color: colors.inactive,
    marginTop: 12,
    lineHeight: 17,
  },
});
