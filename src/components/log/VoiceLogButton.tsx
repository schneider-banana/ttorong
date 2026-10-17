// 음성 기록 버튼 (목 STT 시뮬레이션)
// - 탭 → "듣는 중..." 표시 → mock 결과 수신 → 명령 파싱
//   → 파싱 성공: Alert 확인 다이얼로그(describeCommand 문구) → 확인 시 해당 액션 실행
//   → 파싱 실패: "다시 말씀해주세요" 피드백
// - 실제 STT는 네이티브 모듈 + dev build가 필요하므로
//   지금은 MockSpeechRecognitionProvider를 사용 (src/lib/speech.ts 참고).
import { useEffect, useRef, useState } from "react";
import { Alert, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "../../theme";
import { icons } from "../../icons";
import { MockSpeechRecognitionProvider } from "../../lib/speech";
import {
  describeCommand,
  parseVoiceCommand,
  type VoiceCommand,
} from "../../lib/voiceCommands";
import type { BabyLogEntry } from "../../types";
import type { DiaperKind } from "../../hooks/useBabyLog";

interface VoiceLogButtonProps {
  /** 저장 작업 중이면 버튼 비활성화 */
  disabled?: boolean;
  /** "끝" 명령이 유효한지 판단용 (진행 중인 수유/수면) */
  activeFeeding?: BabyLogEntry | null;
  activeSleep?: BabyLogEntry | null;
  /** true면 작은 마이크 아이콘 버튼만 표시 (홈 빠른 기록 줄용) */
  compact?: boolean;
  onStartFeeding: () => void;
  onEndFeeding: () => void;
  onStartSleep: () => void;
  onEndSleep: () => void;
  onLogDiaper: (kind: DiaperKind) => void;
  onLogTemperature: (value: number) => void;
}

export function VoiceLogButton({
  disabled = false,
  activeFeeding = null,
  activeSleep = null,
  compact = false,
  onStartFeeding,
  onEndFeeding,
  onStartSleep,
  onEndSleep,
  onLogDiaper,
  onLogTemperature,
}: VoiceLogButtonProps) {
  // provider 인스턴스는 마운트 중 하나만 유지 (재생성 방지)
  const providerRef = useRef<MockSpeechRecognitionProvider | null>(null);
  if (providerRef.current === null) {
    providerRef.current = new MockSpeechRecognitionProvider();
  }
  /** mock 인식 결과 대기 중인지 ("듣는 중..." 표시용) */
  const [listening, setListening] = useState(false);

  // 언마운트 시 대기 중인 mock 인식 취소
  useEffect(() => {
    const provider = providerRef.current;
    return () => {
      void provider?.stopListening();
    };
  }, []);

  /** 파싱된 명령을 useBabyLog 액션에 매핑해 실행 */
  const executeCommand = (cmd: VoiceCommand) => {
    switch (cmd.action) {
      case "startFeeding":
        onStartFeeding();
        break;
      case "endFeeding":
        if (activeFeeding === null) {
          Alert.alert("안내", "진행 중인 수유가 없어요.");
          break;
        }
        onEndFeeding();
        break;
      case "startSleep":
        onStartSleep();
        break;
      case "endSleep":
        if (activeSleep === null) {
          Alert.alert("안내", "진행 중인 수면이 없어요.");
          break;
        }
        onEndSleep();
        break;
      case "diaper":
        if (cmd.diaperKind !== undefined) onLogDiaper(cmd.diaperKind);
        break;
      case "temperature":
        if (cmd.temperature !== undefined) onLogTemperature(cmd.temperature);
        break;
    }
  };

  const handlePress = async () => {
    if (disabled || listening) return;
    const provider = providerRef.current;
    if (provider === null) return;

    if (!(await provider.isAvailable())) {
      Alert.alert("안내", "음성 인식을 사용할 수 없어요. (mock)");
      return;
    }

    setListening(true);
    await provider.startListening(
      // mock 인식 결과 수신
      (recognized) => {
        setListening(false);
        const cmd = parseVoiceCommand(recognized);
        if (cmd === null) {
          Alert.alert(
            "못 알아들었어요",
            `"${recognized}"\n다시 말씀해주세요.`
          );
          return;
        }
        Alert.alert("음성 인식 결과", `${recognized}\n${describeCommand(cmd)}`, [
          { text: "취소", style: "cancel" },
          { text: "기록", onPress: () => executeCommand(cmd) },
        ]);
      },
      // 인식 오류 (mock에서는 발생하지 않음)
      (message) => {
        setListening(false);
        Alert.alert("음성 인식 오류", message);
      }
    );
  };

  const inactive = disabled || listening;

  // compact 모드: 작은 마이크 아이콘 버튼 (빠른 기록 줄의 5번째 버튼)
  if (compact) {
    return (
      <Pressable
        style={({ pressed }) => [
          styles.compactButton,
          listening && styles.listeningButton,
          (pressed || disabled) && styles.pressed,
        ]}
        disabled={disabled}
        onPress={handlePress}
        accessibilityLabel="음성으로 기록"
      >
        <Image source={{ uri: icons.Mic }} style={styles.compactTile} />
      </Pressable>
    );
  }

  return (
    <Pressable
      style={({ pressed }) => [
        styles.button,
        listening && styles.listeningButton,
        (pressed || disabled) && styles.pressed,
      ]}
      disabled={disabled}
      onPress={handlePress}
    >
      <Image source={{ uri: icons.Mic }} style={styles.tile} />
      <View style={styles.labelWrap}>
        <Text style={[styles.title, listening && styles.listeningText]}>
          {listening ? "듣는 중..." : "음성으로 기록 (mock)"}
        </Text>
        <Text style={styles.sub}>
          {listening ? "말씀해 보세요 (시뮬레이션 중)" : "탭하면 듣기 시작"}
        </Text>
      </View>
      {inactive ? null : <Text style={styles.hint}>›</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginBottom: 20,
    gap: 14,
  },
  // compact 모드: 빠른 기록 줄의 5번째 버튼 (작은 마이크)
  compactButton: {
    width: 66,
    minHeight: 86,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
  },
  compactTile: {
    width: 54,
    height: 54,
    borderRadius: 16,
  },
  tile: {
    width: 52,
    height: 52,
    borderRadius: 14,
  },
  listeningButton: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  pressed: {
    opacity: 0.6,
  },
  icon: {
    fontSize: 30,
  },
  labelWrap: {
    flex: 1,
  },
  title: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.text,
  },
  listeningText: {
    color: colors.primary,
  },
  sub: {
    fontSize: 13,
    color: colors.textSoft,
    marginTop: 2,
  },
  hint: {
    fontSize: 24,
    color: colors.inactive,
    fontWeight: "600",
  },
});
