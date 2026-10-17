// 시간 입력 필드 (네이티브 타임피커)
// - 박스를 탭하면 피커가 열림 (iOS: 인라인 스피너, Android: 시스템 다이얼로그)
// - 값이 있으면 ✕ 버튼으로 지우기 가능 (종료 시간용)
import { useMemo, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import DateTimePicker, {
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { colors } from "../../theme";

interface TimeFieldProps {
  /** 라벨 */
  label: string;
  /** "HH:MM" (빈 문자열이면 미입력) */
  value: string;
  /** 미입력 시 플레이스홀더 */
  placeholder?: string;
  /** 피커 초기값 (value가 비었을 때, 기본: 현재 시각) */
  fallback?: string;
  /** 값 변경 */
  onChange: (hhmm: string) => void;
  /** 지우기 허용 시 */
  onClear?: () => void;
}

/** "HH:MM" → Date (오늘 날짜 기준) */
function hhmmToDate(hhmm: string): Date {
  const d = new Date();
  const match = hhmm.match(/^(\d{1,2}):(\d{2})$/);
  if (match) {
    d.setHours(Number(match[1]), Number(match[2]), 0, 0);
  }
  return d;
}

/** Date → "HH:MM" */
function dateToHHMM(d: Date): string {
  return `${String(d.getHours()).padStart(2, "0")}:${String(
    d.getMinutes()
  ).padStart(2, "0")}`;
}

export function TimeField({
  label,
  value,
  placeholder = "선택",
  fallback,
  onChange,
  onClear,
}: TimeFieldProps) {
  const [show, setShow] = useState(false);

  const pickerDate = useMemo(
    () => hhmmToDate(value || fallback || dateToHHMM(new Date())),
    [value, fallback]
  );

  const handleChange = (event: DateTimePickerEvent, date?: Date) => {
    // Android: 다이얼로그가 닫히면 피커 숨김
    if (Platform.OS === "android") {
      setShow(false);
    }
    if (event.type === "dismissed") return;
    if (date) {
      onChange(dateToHHMM(date));
    }
  };

  return (
    <View>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.row}>
        <Pressable
          style={({ pressed }) => [
            styles.input,
            pressed && styles.pressed,
          ]}
          onPress={() => setShow(true)}
        >
          <Text style={value ? styles.inputText : styles.placeholderText}>
            {value || placeholder}
          </Text>
        </Pressable>
        {onClear && value !== "" && (
          <Pressable
            style={({ pressed }) => [
              styles.clearButton,
              pressed && styles.pressed,
            ]}
            onPress={onClear}
            accessibilityLabel="시간 지우기"
          >
            <Text style={styles.clearText}>✕</Text>
          </Pressable>
        )}
      </View>
      {show && (
        <View style={styles.pickerWrap}>
          <DateTimePicker
            value={pickerDate}
            mode="time"
            display={Platform.OS === "ios" ? "spinner" : "default"}
            onChange={handleChange}
          />
          {Platform.OS === "ios" && (
            <Pressable
              style={({ pressed }) => [
                styles.doneButton,
                pressed && styles.pressed,
              ]}
              onPress={() => setShow(false)}
            >
              <Text style={styles.doneText}>완료</Text>
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textSoft,
    marginBottom: 6,
    marginTop: 10,
  },
  row: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  input: {
    flex: 1,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  inputText: {
    fontSize: 16,
    color: colors.text,
    fontWeight: "600",
  },
  placeholderText: {
    fontSize: 16,
    color: colors.inactive,
  },
  clearButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  clearText: {
    fontSize: 14,
    color: colors.textSoft,
  },
  pickerWrap: {
    marginTop: 8,
    backgroundColor: colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  doneButton: {
    paddingVertical: 12,
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  doneText: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.primaryDeep,
  },
  pressed: {
    opacity: 0.7,
  },
});
