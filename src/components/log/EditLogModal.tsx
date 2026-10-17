// 기록 수정 바텀시트
// - 타임라인 항목 탭 → 시작/종료 시간, 수유량/체온, 기저귀 종류, 메모 수정
// - 시간은 "HH:MM" 24시간 입력 (항목 당일로 적용)
// - 종료시간을 비우면 진행 중으로 되돌림 (수유/수면)
import { useEffect, useState } from "react";
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { colors } from "../../theme";
import type { BabyLogEntry, BabyLogType, LogEntryPatch } from "../../types";
import { BottomSheet } from "../BottomSheet";

interface EditLogModalProps {
  /** 수정할 항목 (null이면 닫힘) */
  entry: BabyLogEntry | null;
  /** 닫기 */
  onClose: () => void;
  /** 저장 (id + 패치 전달, 실제 저장은 호출자) */
  onSave: (id: string, patch: LogEntryPatch) => void;
}

const TYPE_LABEL: Record<BabyLogType, string> = {
  feeding: "수유",
  sleep: "수면",
  diaper: "기저귀",
  temperature: "체온",
};

/** ISO → "HH:MM" */
function isoToHHMM(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(
    d.getMinutes()
  ).padStart(2, "0")}`;
}

/** "HH:MM" 파싱 (실패 시 null) */
function parseHHMM(raw: string): { h: number; m: number } | null {
  const match = raw.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (h > 23 || m > 59) return null;
  return { h, m };
}

/** 기존 ISO 날짜에 새 시각 적용 */
function applyTimeToDate(iso: string, t: { h: number; m: number }): string {
  const d = new Date(iso);
  d.setHours(t.h, t.m, 0, 0);
  return d.toISOString();
}

export function EditLogModal({ entry, onClose, onSave }: EditLogModalProps) {
  // 닫기 애니메이션 동안 마지막 항목 유지
  const [lastEntry, setLastEntry] = useState<BabyLogEntry | null>(entry);
  useEffect(() => {
    if (entry) setLastEntry(entry);
  }, [entry]);

  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [amount, setAmount] = useState("");
  const [diaperKind, setDiaperKind] = useState<"소변" | "대변">("소변");
  const [note, setNote] = useState("");

  // 항목이 바뀌면 입력값 초기화
  useEffect(() => {
    if (!entry) return;
    setStartTime(isoToHHMM(entry.startedAt));
    setEndTime(entry.endedAt ? isoToHHMM(entry.endedAt) : "");
    setAmount(entry.amount != null ? String(entry.amount) : "");
    if (entry.type === "diaper") {
      setDiaperKind(entry.note === "대변" ? "대변" : "소변");
      setNote("");
    } else {
      setNote(entry.note ?? "");
    }
  }, [entry]);

  const target = lastEntry;
  if (!target) return null;
  const type = target.type;

  const handleSave = () => {
    const start = parseHHMM(startTime);
    if (!start) {
      Alert.alert("입력 확인", "시작 시간을 올바르게 입력해 주세요. (예: 14:30)");
      return;
    }
    const patch: LogEntryPatch = {
      startedAt: applyTimeToDate(target.startedAt, start),
    };

    // 종료 시간 (수유/수면만)
    if (type === "feeding" || type === "sleep") {
      const trimmedEnd = endTime.trim();
      if (trimmedEnd === "") {
        // 비우면 진행 중으로 되돌림
        if (target.endedAt) patch.endedAt = null;
      } else {
        const end = parseHHMM(trimmedEnd);
        if (!end) {
          Alert.alert("입력 확인", "종료 시간을 올바르게 입력해 주세요. (예: 15:10)");
          return;
        }
        const endIso = applyTimeToDate(target.startedAt, end);
        if (new Date(endIso) < new Date(patch.startedAt!)) {
          Alert.alert("입력 확인", "종료 시간은 시작 시간보다 빠를 수 없어요.");
          return;
        }
        patch.endedAt = endIso;
      }
    }

    // 수유량 / 체온
    if (type === "feeding") {
      const trimmed = amount.trim();
      if (trimmed === "") {
        if (target.amount != null) patch.amount = null;
      } else {
        const ml = Math.round(Number(trimmed));
        if (Number.isNaN(ml) || ml < 0 || ml > 1000) {
          Alert.alert("입력 확인", "수유량을 올바르게 입력해 주세요. (예: 120)");
          return;
        }
        patch.amount = ml;
      }
    }
    if (type === "temperature") {
      const v = Number(amount.trim());
      if (Number.isNaN(v) || v < 30 || v > 45) {
        Alert.alert("입력 확인", "체온을 올바르게 입력해 주세요. (예: 36.5)");
        return;
      }
      patch.amount = Math.round(v * 10) / 10;
    }

    // 기저귀 종류 / 메모
    if (type === "diaper") {
      patch.note = diaperKind;
    } else {
      patch.note = note.trim() === "" ? null : note.trim();
    }

    onSave(target.id, patch);
    onClose();
  };

  return (
    <BottomSheet visible={entry !== null} onClose={onClose}>
      <Text style={styles.title}>{TYPE_LABEL[type]} 기록 수정</Text>

      {/* 시작 시간 */}
      <Text style={styles.label}>시작 시간</Text>
      <TextInput
        style={styles.input}
        value={startTime}
        onChangeText={setStartTime}
        keyboardType="numbers-and-punctuation"
        placeholder="14:30"
        placeholderTextColor={colors.inactive}
        maxLength={5}
      />

      {/* 종료 시간 (수유/수면) */}
      {(type === "feeding" || type === "sleep") && (
        <>
          <Text style={styles.label}>종료 시간 (비우면 진행 중)</Text>
          <TextInput
            style={styles.input}
            value={endTime}
            onChangeText={setEndTime}
            keyboardType="numbers-and-punctuation"
            placeholder="진행 중"
            placeholderTextColor={colors.inactive}
            maxLength={5}
          />
        </>
      )}

      {/* 수유량 */}
      {type === "feeding" && (
        <>
          <Text style={styles.label}>수유량 (ml, 선택)</Text>
          <TextInput
            style={styles.input}
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            placeholder="120"
            placeholderTextColor={colors.inactive}
          />
        </>
      )}

      {/* 체온 */}
      {type === "temperature" && (
        <>
          <Text style={styles.label}>체온 (℃)</Text>
          <TextInput
            style={styles.input}
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            placeholder="36.5"
            placeholderTextColor={colors.inactive}
          />
        </>
      )}

      {/* 기저귀 종류 */}
      {type === "diaper" && (
        <>
          <Text style={styles.label}>종류</Text>
          <View style={styles.kindRow}>
            {(["소변", "대변"] as const).map((kind) => (
              <Pressable
                key={kind}
                style={[
                  styles.kindButton,
                  diaperKind === kind && styles.kindButtonActive,
                ]}
                onPress={() => setDiaperKind(kind)}
              >
                <Text
                  style={[
                    styles.kindText,
                    diaperKind === kind && styles.kindTextActive,
                  ]}
                >
                  {kind}
                </Text>
              </Pressable>
            ))}
          </View>
        </>
      )}

      {/* 메모 (기저귀 제외) */}
      {type !== "diaper" && (
        <>
          <Text style={styles.label}>메모 (선택)</Text>
          <TextInput
            style={styles.input}
            value={note}
            onChangeText={setNote}
            placeholder="메모를 입력하세요"
            placeholderTextColor={colors.inactive}
          />
        </>
      )}

      <View style={styles.buttons}>
        <Pressable
          style={({ pressed }) => [
            styles.button,
            styles.buttonSecondary,
            pressed && styles.pressed,
          ]}
          onPress={onClose}
        >
          <Text style={styles.buttonSecondaryText}>취소</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [
            styles.button,
            styles.buttonPrimary,
            pressed && styles.pressed,
          ]}
          onPress={handleSave}
        >
          <Text style={styles.buttonPrimaryText}>저장</Text>
        </Pressable>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
    textAlign: "center",
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textSoft,
    marginBottom: 6,
    marginTop: 10,
  },
  input: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text,
  },
  kindRow: {
    flexDirection: "row",
    gap: 10,
  },
  kindButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: colors.background,
  },
  kindButtonActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  kindText: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.textSoft,
  },
  kindTextActive: {
    color: colors.primaryDeep,
    fontWeight: "700",
  },
  buttons: {
    flexDirection: "row",
    gap: 10,
    marginTop: 20,
  },
  button: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  buttonSecondary: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  buttonPrimary: {
    backgroundColor: colors.primary,
  },
  buttonSecondaryText: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.textSoft,
  },
  buttonPrimaryText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  pressed: {
    opacity: 0.7,
  },
});
