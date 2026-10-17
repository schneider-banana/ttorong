// 기록 수정 바텀시트 (공용 입력 폼 사용)
import { useEffect, useState } from "react";
import { StyleSheet, Text } from "react-native";
import { colors } from "../../theme";
import type { BabyLogEntry, BabyLogType, LogEntryPatch } from "../../types";
import { BottomSheet } from "../BottomSheet";
import { LogEntryForm, type LogFormData } from "./LogEntryForm";

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

export function EditLogModal({ entry, onClose, onSave }: EditLogModalProps) {
  // 닫기 애니메이션 동안 마지막 항목 유지
  const [lastEntry, setLastEntry] = useState<BabyLogEntry | null>(entry);
  useEffect(() => {
    if (entry) setLastEntry(entry);
  }, [entry]);

  const target = lastEntry;
  if (!target) return null;

  const handleSave = (data: LogFormData) => {
    const patch: LogEntryPatch = {
      startedAt: data.startedAt,
      endedAt: data.endedAt,
      amount: data.amount,
      note: data.note,
    };
    onSave(target.id, patch);
    onClose();
  };

  return (
    <BottomSheet visible={entry !== null} onClose={onClose}>
      <Text style={styles.title}>{TYPE_LABEL[target.type]} 기록 수정</Text>
      <LogEntryForm
        key={target.id}
        type={target.type}
        initial={{
          startedAt: target.startedAt,
          endedAt: target.endedAt,
          amount: target.amount,
          note: target.note,
        }}
        onSave={handleSave}
        onCancel={onClose}
      />
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
});
