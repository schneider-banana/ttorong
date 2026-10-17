// 오늘의 기록 타임라인
// - 시간순(최신순) 목록, 항목 탭 → 수정, ✕ → 삭제
import { useState } from "react";
import { ActivityIndicator, Alert, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "../../theme";
import { icons } from "../../icons";
import type { BabyLogEntry, BabyLogType, LogEntryPatch } from "../../types";
import {
  formatClockTime,
  formatDuration,
  minutesSince,
} from "../../hooks/useBabyLog";
import { EditLogModal } from "./EditLogModal";

interface LogTimelineProps {
  /** 오늘의 기록 (최신순) */
  entries: BabyLogEntry[];
  /** 목록 로딩 중 */
  loading: boolean;
  /** 삭제 요청 (확인 후 실제 삭제는 호출자) */
  onDelete: (id: string) => void;
  /** 수정 요청 (실제 저장은 호출자) */
  onUpdate: (id: string, patch: LogEntryPatch) => void;
}

/** 로그 종류별 메타 정보 */
const TYPE_META: Record<BabyLogType, { icon: string; label: string }> = {
  feeding: { icon: icons.Feeding, label: "수유" },
  sleep: { icon: icons.Sleep, label: "수면" },
  diaper: { icon: icons.Diaper, label: "기저귀" },
  temperature: { icon: icons.Temp, label: "체온" },
};

/** 항목별 상세 문구 (예: "오전 8:30 · 35분간 · 120ml", "소변", "36.5℃") */
function describeEntry(entry: BabyLogEntry): string {
  const start = formatClockTime(entry.startedAt);
  switch (entry.type) {
    case "feeding": {
      const amount = entry.amount != null ? ` · ${entry.amount}ml` : "";
      if (entry.endedAt) {
        return `${start} · ${formatDuration(minutesSince(entry.startedAt, new Date(entry.endedAt)))}간${amount}`;
      }
      return `${start} · 진행 중`;
    }
    case "sleep":
      if (entry.endedAt) {
        return `${start} · ${formatDuration(minutesSince(entry.startedAt, new Date(entry.endedAt)))}간`;
      }
      return `${start} · 진행 중`;
    case "diaper":
      return entry.note ? `${start} · ${entry.note}` : start;
    case "temperature":
      return entry.amount != null ? `${start} · ${entry.amount.toFixed(1)}℃` : start;
  }
}

export function LogTimeline({ entries, loading, onDelete, onUpdate }: LogTimelineProps) {
  const [editingEntry, setEditingEntry] = useState<BabyLogEntry | null>(null);

  const confirmDelete = (entry: BabyLogEntry) => {
    const label = TYPE_META[entry.type].label;
    Alert.alert("기록 삭제", `${label} 기록(${describeEntry(entry)})을 삭제할까요?`, [
      { text: "취소", style: "cancel" },
      {
        text: "삭제",
        style: "destructive",
        onPress: () => onDelete(entry.id),
      },
    ]);
  };

  return (
    <View>
      <Text style={styles.sectionTitle}>오늘의 기록</Text>

      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : entries.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyText}>오늘 기록이 아직 없어요.</Text>
          <Text style={styles.emptySub}>위 버튼을 눌러 첫 기록을 남겨보세요.</Text>
        </View>
      ) : (
        <View style={styles.list}>
          {entries.map((entry) => {
            const meta = TYPE_META[entry.type];
            return (
              <Pressable
                key={entry.id}
                style={({ pressed }) => [
                  styles.row,
                  pressed && styles.rowPressed,
                ]}
                onPress={() => setEditingEntry(entry)}
                accessibilityLabel={`${meta.label} 기록 수정`}
              >
                <Image source={{ uri: meta.icon }} style={styles.iconBadge} />
                <View style={styles.rowText}>
                  <Text style={styles.rowLabel}>{meta.label}</Text>
                  <Text style={styles.rowDetail}>{describeEntry(entry)}</Text>
                </View>
                <Pressable
                  style={({ pressed }) => [
                    styles.deleteButton,
                    pressed && styles.pressed,
                  ]}
                  onPress={() => confirmDelete(entry)}
                  hitSlop={12}
                  accessibilityLabel={`${meta.label} 기록 삭제`}
                >
                  <Text style={styles.deleteText}>✕</Text>
                </Pressable>
              </Pressable>
            );
          })}
        </View>
      )}

      <EditLogModal
        entry={editingEntry}
        onClose={() => setEditingEntry(null)}
        onSave={onUpdate}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    fontSize: 19,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 12,
  },
  centerBox: {
    paddingVertical: 32,
    alignItems: "center",
  },
  emptyBox: {
    backgroundColor: "#FFF6EA",
    borderRadius: 16,
    paddingVertical: 28,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.textSoft,
    marginBottom: 6,
  },
  emptySub: {
    fontSize: 14,
    color: colors.inactive,
  },
  list: {
    gap: 10,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  rowPressed: {
    opacity: 0.7,
  },
  iconBadge: {
    width: 48,
    height: 48,
    borderRadius: 14,
  },
  rowText: {
    flex: 1,
  },
  rowLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 2,
  },
  rowDetail: {
    fontSize: 14,
    color: colors.textSoft,
  },
  deleteButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.7)",
    alignItems: "center",
    justifyContent: "center",
  },
  deleteText: {
    fontSize: 15,
    color: colors.danger,
  },
  pressed: {
    opacity: 0.6,
  },
});
