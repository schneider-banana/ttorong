// 일정 입력 폼 (모달 안에서 사용)
// - 제목(필수), 날짜(YYYY-MM-DD), 시작/종료 시간(HH:mm, 선택)
// - 종류 선택: 예방접종/병원/어린이집/일반 (색상 뱃지)
// - 담당자(선택), 메모(선택)
// NOTE: 날짜/시간은 기본 텍스트 입력으로 구현 (네이티브 피커 라이브러리 미도입).
// TODO: auth 연동 후 담당자 입력은 멤버 선택 UI로 교체할 것.
import { useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import type { CalendarEvent, CalendarEventKind } from "../../types";
import { colors } from "../../theme";
import {
  EVENT_KIND_META,
  EVENT_KIND_ORDER,
  isValidDateString,
  isValidTimeString,
} from "./eventKind";

/** 폼에서 수집되는 일정 입력 값 */
export type EventFormValue = Omit<CalendarEvent, "id" | "familyId">;

interface EventFormProps {
  /** 폼에 미리 채울 날짜 (보통 선택된 날짜) */
  initialDate: string;
  /** 저장 버튼 눌렀을 때 */
  onSubmit: (value: EventFormValue) => void;
  /** 취소 버튼 눌렀을 때 */
  onCancel: () => void;
}

export function EventForm({ initialDate, onSubmit, onCancel }: EventFormProps) {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(initialDate);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [kind, setKind] = useState<CalendarEventKind>("general");
  const [assignee, setAssignee] = useState("");
  const [memo, setMemo] = useState("");

  const handleSubmit = () => {
    if (title.trim() === "") {
      Alert.alert("입력 확인", "일정 제목을 입력해 주세요.");
      return;
    }
    if (!isValidDateString(date)) {
      Alert.alert("입력 확인", "날짜는 YYYY-MM-DD 형식으로 입력해 주세요.");
      return;
    }
    if (!isValidTimeString(startTime) || !isValidTimeString(endTime)) {
      Alert.alert(
        "입력 확인",
        "시간은 HH:mm 형식으로 입력해 주세요. (예: 09:30)"
      );
      return;
    }

    onSubmit({
      title: title.trim(),
      date,
      startTime: startTime === "" ? undefined : startTime,
      endTime: endTime === "" ? undefined : endTime,
      kind,
      // TODO: auth 연동 후 멤버 ID 선택 UI로 교체
      assigneeId: assignee.trim() === "" ? undefined : assignee.trim(),
      memo: memo.trim() === "" ? undefined : memo.trim(),
    });
  };

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.formTitle}>새 일정</Text>

      {/* 제목 */}
      <Text style={styles.label}>제목 *</Text>
      <TextInput
        style={styles.input}
        value={title}
        onChangeText={setTitle}
        placeholder="예: 독감 예방접종"
        placeholderTextColor={colors.inactive}
        returnKeyType="next"
      />

      {/* 날짜 */}
      <Text style={styles.label}>날짜 *</Text>
      <TextInput
        style={styles.input}
        value={date}
        onChangeText={setDate}
        placeholder="YYYY-MM-DD (예: 2026-10-20)"
        placeholderTextColor={colors.inactive}
        keyboardType="numbers-and-punctuation"
      />

      {/* 시간 */}
      <View style={styles.row}>
        <View style={styles.half}>
          <Text style={styles.label}>시작 시간</Text>
          <TextInput
            style={styles.input}
            value={startTime}
            onChangeText={setStartTime}
            placeholder="09:30"
            placeholderTextColor={colors.inactive}
            keyboardType="numbers-and-punctuation"
          />
        </View>
        <View style={styles.half}>
          <Text style={styles.label}>종료 시간</Text>
          <TextInput
            style={styles.input}
            value={endTime}
            onChangeText={setEndTime}
            placeholder="10:30"
            placeholderTextColor={colors.inactive}
            keyboardType="numbers-and-punctuation"
          />
        </View>
      </View>

      {/* 종류 */}
      <Text style={styles.label}>종류</Text>
      <View style={styles.kindRow}>
        {EVENT_KIND_ORDER.map((k) => {
          const meta = EVENT_KIND_META[k];
          const selected = k === kind;
          return (
            <Pressable
              key={k}
              style={[
                styles.kindButton,
                selected && {
                  borderColor: meta.color,
                  backgroundColor: `${meta.color}15`,
                },
              ]}
              onPress={() => setKind(k)}
            >
              <View
                style={[styles.kindDot, { backgroundColor: meta.color }]}
              />
              <Text
                style={[
                  styles.kindLabel,
                  selected && { color: meta.color, fontWeight: "700" },
                ]}
              >
                {meta.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* 담당자 */}
      <Text style={styles.label}>담당자</Text>
      <TextInput
        style={styles.input}
        value={assignee}
        onChangeText={setAssignee}
        placeholder="예: 엄마 (선택)"
        placeholderTextColor={colors.inactive}
      />

      {/* 메모 */}
      <Text style={styles.label}>메모</Text>
      <TextInput
        style={[styles.input, styles.memoInput]}
        value={memo}
        onChangeText={setMemo}
        placeholder="추가 메모 (선택)"
        placeholderTextColor={colors.inactive}
        multiline
        numberOfLines={3}
        textAlignVertical="top"
      />

      {/* 버튼 */}
      <View style={styles.buttonRow}>
        <Pressable style={[styles.button, styles.cancelButton]} onPress={onCancel}>
          <Text style={styles.cancelText}>취소</Text>
        </Pressable>
        <Pressable style={[styles.button, styles.saveButton]} onPress={handleSubmit}>
          <Text style={styles.saveText}>저장</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 24,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 16,
    color: colors.text,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
    marginTop: 12,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    backgroundColor: colors.card,
    color: colors.text,
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },
  half: {
    flex: 1,
  },
  kindRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  kindButton: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.card,
  },
  kindDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 6,
  },
  kindLabel: {
    fontSize: 14,
    color: colors.textSoft,
  },
  memoInput: {
    minHeight: 72,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 24,
    marginBottom: 12,
  },
  button: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "#F5EDE0",
  },
  saveButton: {
    backgroundColor: colors.primary,
  },
  cancelText: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.textSoft,
  },
  saveText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#ffffff",
  },
});
