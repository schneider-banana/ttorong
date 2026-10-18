// 발달 마일스톤 체크리스트 (성장 탭)
// - BabyTime식 마일스톤 기록: 0-24개월 26개 항목, 달성일 체크
// - 무료 기능
import { useCallback, useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { colors, radius } from "../theme";
import { MILESTONES, milestonesForAge } from "../data/milestones";
import { ageInMonths } from "../lib/napPredict";
import { useDatabase } from "../hooks/useDatabase";
import type { Child } from "../types";

/** 오늘 날짜 (YYYY-MM-DD, 로컬) */
function todayString(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

interface MilestoneSectionProps {
  child: Child | null;
}

export function MilestoneSection({ child }: MilestoneSectionProps) {
  const db = useDatabase();
  const [achieved, setAchieved] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const months = ageInMonths(child?.birthDate ?? null);
  const list = months !== null ? milestonesForAge(months) : MILESTONES.slice(0, 8);

  const load = useCallback(async () => {
    if (!child) {
      setAchieved({});
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const rec = await db.getMilestones(child.id);
      setAchieved(rec.achieved);
    } catch {
      // 로그인 전 등: 빈 상태 유지
    } finally {
      setLoading(false);
    }
  }, [db, child?.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const toggle = async (milestoneId: string) => {
    if (!child) return;
    const isDone = !!achieved[milestoneId];
    // 낙관적 업데이트
    setAchieved((prev) => {
      const next = { ...prev };
      if (isDone) delete next[milestoneId];
      else next[milestoneId] = todayString();
      return next;
    });
    try {
      await db.setMilestone(child.id, milestoneId, isDone ? null : todayString());
    } catch {
      // 실패 시 롤백
      void load();
    }
  };

  if (!child) return null;

  const doneCount = list.filter((m) => achieved[m.id]).length;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.cardTitle}>발달 마일스톤</Text>
        <Text style={styles.count}>
          {doneCount}/{list.length}
        </Text>
      </View>
      {loading ? (
        <Text style={styles.hint}>불러오는 중…</Text>
      ) : (
        list.map((m) => {
          const done = !!achieved[m.id];
          return (
            <Pressable
              key={m.id}
              style={styles.row}
              onPress={() => void toggle(m.id)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: done }}
            >
              <MaterialIcons
                name={done ? "check-circle" : "radio-button-unchecked"}
                size={22}
                color={done ? colors.primary : colors.inactive}
              />
              <View style={styles.rowText}>
                <Text style={[styles.title, done && styles.titleDone]}>
                  {m.title}
                </Text>
                <Text style={styles.meta}>
                  {m.ageLabel} · {m.category}
                  {done ? ` · ${achieved[m.id]}` : ""}
                </Text>
              </View>
            </Pressable>
          );
        })
      )}
      <Text style={styles.disclaimer}>
        일반적인 발달 참고용이며, 개인차이가 큽니다. 걱정되면 소아과와 상담하세요.
      </Text>
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
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  cardTitle: { fontSize: 16, fontWeight: "800", color: colors.text },
  count: { fontSize: 13, fontWeight: "700", color: colors.primaryDeep },
  hint: { fontSize: 13, color: colors.textSoft, paddingVertical: 8 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 9,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  rowText: { flex: 1, marginLeft: 10 },
  title: { fontSize: 14, fontWeight: "600", color: colors.text },
  titleDone: { color: colors.textSoft, textDecorationLine: "line-through" },
  meta: { fontSize: 12, color: colors.textSoft, marginTop: 2 },
  disclaimer: {
    fontSize: 11,
    color: colors.inactive,
    lineHeight: 16,
    marginTop: 10,
  },
});
