// 원터치 기록 버튼 4개: 수유 시작/종료, 수면 시작/종료, 기저귀, 체온
// - 한 손 조작을 고려해 버튼을 크게 만듭니다 (2x2 그리드).
// - 수유/수면: 시작 탭 → "진행 중" 표시 → 종료 탭으로 한 쌍 기록.
// - 기저귀: 액션시트에서 소변/대변 선택 → 탭 한 번에 즉시 기록.
// - 체온: 숫자 입력(예: 36.5) 후 저장.
import { useEffect, useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import type { BabyLogEntry } from "../../types";
import {
  formatDuration,
  minutesSince,
  type DiaperKind,
} from "../../hooks/useBabyLog";

interface QuickLogButtonsProps {
  /** 진행 중인 수유 (없으면 null) */
  activeFeeding: BabyLogEntry | null;
  /** 진행 중인 수면 (없으면 null) */
  activeSleep: BabyLogEntry | null;
  /** 저장 작업 중이면 버튼 비활성화 */
  disabled?: boolean;
  /** true면 한 줄 컴팩트 레이아웃 (홈 상단 고정 영역용) */
  compact?: boolean;
  onStartFeeding: () => void;
  onEndFeeding: () => void;
  onStartSleep: () => void;
  onEndSleep: () => void;
  onLogDiaper: (kind: DiaperKind) => void;
  onLogTemperature: (value: number) => void;
}

/** 1분마다 갱신되는 현재 시각 (진행 중 경과 표시용) */
function useNowTick(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);
  return now;
}

/** 체온 입력값 검증: 30~45℃ 범위의 숫자 */
function parseTemperature(raw: string): number | null {
  const value = parseFloat(raw.trim());
  if (Number.isNaN(value) || value < 30 || value > 45) return null;
  return Math.round(value * 10) / 10;
}

export function QuickLogButtons({
  activeFeeding,
  activeSleep,
  disabled = false,
  compact = false,
  onStartFeeding,
  onEndFeeding,
  onStartSleep,
  onEndSleep,
  onLogDiaper,
  onLogTemperature,
}: QuickLogButtonsProps) {
  const now = useNowTick();
  const [diaperSheetOpen, setDiaperSheetOpen] = useState(false);
  const [tempModalOpen, setTempModalOpen] = useState(false);
  const [tempInput, setTempInput] = useState("");

  const feedingActive = activeFeeding !== null;
  const sleepActive = activeSleep !== null;

  // compact 모드면 한 줄 레이아웃용 스타일로 전환
  const gridStyle = compact ? styles.compactGrid : styles.grid;
  const btnStyle = compact ? styles.compactButton : styles.bigButton;
  const iconStyle = compact ? styles.compactIcon : styles.icon;
  const titleStyle = compact ? styles.compactTitle : styles.buttonTitle;
  const subStyle = compact ? styles.compactSub : styles.buttonSub;

  const handleDiaperSelect = (kind: DiaperKind) => {
    setDiaperSheetOpen(false);
    onLogDiaper(kind);
  };

  const handleTempSave = () => {
    const value = parseTemperature(tempInput);
    if (value === null) {
      Alert.alert("입력 확인", "체온을 올바르게 입력해 주세요. (예: 36.5)");
      return;
    }
    setTempModalOpen(false);
    setTempInput("");
    onLogTemperature(value);
  };

  return (
    <View>
      <View style={gridStyle}>
        {/* 수유 */}
        <Pressable
          style={({ pressed }) => [
            btnStyle,
            feedingActive && styles.activeButton,
            (pressed || disabled) && styles.pressed,
          ]}
          disabled={disabled}
          onPress={feedingActive ? onEndFeeding : onStartFeeding}
        >
          <Text style={iconStyle}>🍼</Text>
          <Text style={[titleStyle, feedingActive && styles.activeText]}>
            {feedingActive ? "수유 종료" : "수유 시작"}
          </Text>
          {feedingActive && (
            <Text style={[subStyle, styles.activeText]}>
              {formatDuration(minutesSince(activeFeeding.startedAt, now))}째
            </Text>
          )}
        </Pressable>

        {/* 수면 */}
        <Pressable
          style={({ pressed }) => [
            btnStyle,
            sleepActive && styles.activeButton,
            (pressed || disabled) && styles.pressed,
          ]}
          disabled={disabled}
          onPress={sleepActive ? onEndSleep : onStartSleep}
        >
          <Text style={iconStyle}>😴</Text>
          <Text style={[titleStyle, sleepActive && styles.activeText]}>
            {sleepActive ? "수면 종료" : "수면 시작"}
          </Text>
          {sleepActive && (
            <Text style={[subStyle, styles.activeText]}>
              {formatDuration(minutesSince(activeSleep.startedAt, now))}째
            </Text>
          )}
        </Pressable>

        {/* 기저귀 */}
        <Pressable
          style={({ pressed }) => [btnStyle, (pressed || disabled) && styles.pressed]}
          disabled={disabled}
          onPress={() => setDiaperSheetOpen(true)}
        >
          <Text style={iconStyle}>🧷</Text>
          <Text style={titleStyle}>기저귀</Text>
          {!compact && <Text style={subStyle}>탭 한 번에 기록</Text>}
        </Pressable>

        {/* 체온 */}
        <Pressable
          style={({ pressed }) => [btnStyle, (pressed || disabled) && styles.pressed]}
          disabled={disabled}
          onPress={() => setTempModalOpen(true)}
        >
          <Text style={iconStyle}>🌡️</Text>
          <Text style={titleStyle}>체온</Text>
          {!compact && <Text style={subStyle}>숫자 입력 후 저장</Text>}
        </Pressable>
      </View>

      {/* 기저귀 액션시트: 소변/대변 선택 */}
      <Modal
        visible={diaperSheetOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setDiaperSheetOpen(false)}
      >
        <Pressable
          style={styles.sheetOverlay}
          onPress={() => setDiaperSheetOpen(false)}
        >
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>기저귀 기록</Text>
            {(["소변", "대변"] as DiaperKind[]).map((kind) => (
              <Pressable
                key={kind}
                style={({ pressed }) => [
                  styles.sheetOption,
                  pressed && styles.pressed,
                ]}
                onPress={() => handleDiaperSelect(kind)}
              >
                <Text style={styles.sheetOptionText}>{kind}</Text>
              </Pressable>
            ))}
            <Pressable
              style={({ pressed }) => [
                styles.sheetCancel,
                pressed && styles.pressed,
              ]}
              onPress={() => setDiaperSheetOpen(false)}
            >
              <Text style={styles.sheetCancelText}>취소</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      {/* 체온 입력 모달 */}
      <Modal
        visible={tempModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setTempModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>체온 기록</Text>
            <View style={styles.tempInputRow}>
              <TextInput
                style={styles.tempInput}
                value={tempInput}
                onChangeText={setTempInput}
                keyboardType="decimal-pad"
                placeholder="36.5"
                placeholderTextColor="#aaa"
                autoFocus
                returnKeyType="done"
                onSubmitEditing={handleTempSave}
              />
              <Text style={styles.tempUnit}>℃</Text>
            </View>
            <View style={styles.modalButtons}>
              <Pressable
                style={({ pressed }) => [
                  styles.modalButton,
                  styles.modalButtonSecondary,
                  pressed && styles.pressed,
                ]}
                onPress={() => setTempModalOpen(false)}
              >
                <Text style={styles.modalButtonSecondaryText}>취소</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.modalButton,
                  styles.modalButtonPrimary,
                  pressed && styles.pressed,
                ]}
                onPress={handleTempSave}
              >
                <Text style={styles.modalButtonPrimaryText}>저장</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 20,
  },
  // compact 모드: 한 줄 4버튼 (홈 상단 고정 영역용)
  compactGrid: {
    flexDirection: "row",
    gap: 8,
  },
  compactButton: {
    flex: 1,
    minHeight: 78,
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#eee",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 2,
  },
  compactIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  compactTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#333",
  },
  compactSub: {
    fontSize: 11,
    color: "#999",
    marginTop: 2,
  },
  bigButton: {
    flexBasis: "48%",
    flexGrow: 1,
    minHeight: 108,
    backgroundColor: "#fff",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#eee",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
    paddingHorizontal: 8,
  },
  activeButton: {
    backgroundColor: "#FF8C42",
    borderColor: "#FF8C42",
  },
  pressed: {
    opacity: 0.6,
  },
  icon: {
    fontSize: 34,
    marginBottom: 6,
  },
  buttonTitle: {
    fontSize: 19,
    fontWeight: "700",
    color: "#333",
  },
  buttonSub: {
    fontSize: 13,
    color: "#999",
    marginTop: 4,
  },
  activeText: {
    color: "#fff",
  },
  // --- 기저귀 액션시트 ---
  sheetOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 32,
    gap: 10,
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 6,
    color: "#333",
  },
  sheetOption: {
    backgroundColor: "#f5f5f5",
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: "center",
  },
  sheetOptionText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  sheetCancel: {
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 4,
  },
  sheetCancelText: {
    fontSize: 17,
    color: "#999",
  },
  // --- 체온 모달 ---
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  modal: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 24,
    width: "100%",
  },
  modalTitle: {
    fontSize: 19,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 16,
    color: "#333",
  },
  tempInputRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    gap: 6,
  },
  tempInput: {
    fontSize: 40,
    fontWeight: "700",
    textAlign: "center",
    borderBottomWidth: 2,
    borderBottomColor: "#FF8C42",
    minWidth: 140,
    paddingVertical: 6,
    color: "#333",
  },
  tempUnit: {
    fontSize: 24,
    color: "#666",
  },
  modalButtons: {
    flexDirection: "row",
    gap: 10,
  },
  modalButton: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  modalButtonSecondary: {
    backgroundColor: "#f0f0f0",
  },
  modalButtonSecondaryText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#666",
  },
  modalButtonPrimary: {
    backgroundColor: "#FF8C42",
  },
  modalButtonPrimaryText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
  },
});
