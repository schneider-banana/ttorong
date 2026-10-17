// 기록 직접 추가 바텀시트
// - "아까 못 누른 기록"을 나중에 입력 (시작 시간 직접 지정)
import { useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "../../theme";
import { icons } from "../../icons";
import type { BabyLogType } from "../../types";
import { BottomSheet } from "../BottomSheet";
import { LogEntryForm, type LogFormData } from "./LogEntryForm";

interface AddLogSheetProps {
  /** 표시 여부 */
  visible: boolean;
  /** 닫기 */
  onClose: () => void;
  /** 저장 (타입 + 입력값 전달, 실제 저장은 호출자) */
  onSave: (type: BabyLogType, data: LogFormData) => void;
}

const TYPES: { type: BabyLogType; label: string; icon: string }[] = [
  { type: "feeding", label: "수유", icon: icons.Feeding },
  { type: "sleep", label: "수면", icon: icons.Sleep },
  { type: "diaper", label: "기저귀", icon: icons.Diaper },
  { type: "temperature", label: "체온", icon: icons.Temp },
];

export function AddLogSheet({ visible, onClose, onSave }: AddLogSheetProps) {
  const [type, setType] = useState<BabyLogType>("feeding");

  const handleSave = (data: LogFormData) => {
    onSave(type, data);
    onClose();
  };

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <Text style={styles.title}>기록 추가</Text>
      <Text style={styles.subtitle}>잊고 못 누른 기록을 입력하세요</Text>
      <View style={styles.typeRow}>
        {TYPES.map((t) => (
          <Pressable
            key={t.type}
            style={[
              styles.typeButton,
              type === t.type && styles.typeButtonActive,
            ]}
            onPress={() => setType(t.type)}
          >
            <Image source={{ uri: t.icon }} style={styles.typeIcon} />
            <Text
              style={[
                styles.typeLabel,
                type === t.type && styles.typeLabelActive,
              ]}
            >
              {t.label}
            </Text>
          </Pressable>
        ))}
      </View>
      <LogEntryForm
        key={type}
        type={type}
        saveLabel="추가"
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
  },
  subtitle: {
    fontSize: 13,
    color: colors.textSoft,
    textAlign: "center",
    marginTop: 4,
    marginBottom: 12,
  },
  typeRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 4,
  },
  typeButton: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    gap: 4,
  },
  typeButtonActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  typeIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
  },
  typeLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textSoft,
  },
  typeLabelActive: {
    color: colors.primaryDeep,
    fontWeight: "700",
  },
});
