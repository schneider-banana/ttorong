// 인증 시작 화면
// - "가족 만들기": 가족 이름 + 내 이름 입력 → 초대코드 발급 화면
// - "초대코드로 참여하기": (auth)/join 화면으로 이동
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { router } from "expo-router";
import * as Clipboard from "expo-clipboard";
import { useAuth } from "../../src/hooks/useAuth";

/** 이 화면 내부의 단계 */
type Step = "start" | "create" | "code";

export default function AuthStartScreen() {
  const { createFamily } = useAuth();
  const [step, setStep] = useState<Step>("start");
  const [familyName, setFamilyName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  /** 가족 만들기 제출 → 초대코드 발급 */
  const handleCreate = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const { family } = await createFamily(familyName, displayName);
      setInviteCode(family.inviteCode);
      setCopied(false);
      setStep("code");
    } catch (e) {
      Alert.alert(
        "가족 만들기 실패",
        e instanceof Error ? e.message : "다시 시도해 주세요."
      );
    } finally {
      setSubmitting(false);
    }
  };

  /** 초대코드 복사 */
  const handleCopy = async () => {
    await Clipboard.setStringAsync(inviteCode);
    setCopied(true);
  };

  /** 코드 화면에서 시작하기 → 탭 화면 진입 */
  const handleEnter = () => {
    router.replace("/(tabs)");
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>👶 또롱이</Text>
      <Text style={styles.subtitle}>가족과 함께 쓰는 육아 기록</Text>

      {step === "start" && (
        <View style={styles.buttonBox}>
          <Pressable
            style={[styles.button, styles.primaryButton]}
            onPress={() => setStep("create")}
          >
            <Text style={styles.primaryButtonText}>가족 만들기</Text>
          </Pressable>
          <Pressable
            style={[styles.button, styles.secondaryButton]}
            onPress={() => router.push("/(auth)/join")}
          >
            <Text style={styles.secondaryButtonText}>초대코드로 참여하기</Text>
          </Pressable>
        </View>
      )}

      {step === "create" && (
        <View style={styles.form}>
          <Text style={styles.label}>가족 이름</Text>
          <TextInput
            style={styles.input}
            placeholder="예: 김가네"
            value={familyName}
            onChangeText={setFamilyName}
            autoFocus
          />
          <Text style={styles.label}>내 이름</Text>
          <TextInput
            style={styles.input}
            placeholder="예: 엄마"
            value={displayName}
            onChangeText={setDisplayName}
          />
          <Pressable
            style={[styles.button, styles.primaryButton]}
            onPress={handleCreate}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryButtonText}>초대코드 만들기</Text>
            )}
          </Pressable>
          <Pressable style={styles.backLink} onPress={() => setStep("start")}>
            <Text style={styles.backLinkText}>← 돌아가기</Text>
          </Pressable>
        </View>
      )}

      {step === "code" && (
        <View style={styles.codeBox}>
          <Text style={styles.codeTitle}>가족 초대코드</Text>
          <Text style={styles.codeHelp}>
            가족에게 이 코드를 알려주세요.{"\n"}코드를 입력하면 같은 가족으로
            함께 쓸 수 있어요.
          </Text>
          <View style={styles.codeCard}>
            <Text style={styles.code}>{inviteCode}</Text>
          </View>
          <Pressable
            style={[styles.button, styles.secondaryButton]}
            onPress={handleCopy}
          >
            <Text style={styles.secondaryButtonText}>
              {copied ? "복사됨 ✓" : "코드 복사하기"}
            </Text>
          </Pressable>
          <Pressable
            style={[styles.button, styles.primaryButton]}
            onPress={handleEnter}
          >
            <Text style={styles.primaryButtonText}>시작하기</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 28,
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: "#666",
    textAlign: "center",
    marginBottom: 40,
  },
  buttonBox: {
    gap: 12,
  },
  form: {
    gap: 4,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    marginTop: 12,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 4,
  },
  button: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 12,
  },
  primaryButton: {
    backgroundColor: "#4a7cfb",
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  secondaryButton: {
    backgroundColor: "#f0f3fa",
  },
  secondaryButtonText: {
    color: "#4a7cfb",
    fontSize: 16,
    fontWeight: "700",
  },
  backLink: {
    alignItems: "center",
    marginTop: 16,
    paddingVertical: 8,
  },
  backLinkText: {
    color: "#888",
    fontSize: 14,
  },
  codeBox: {
    alignItems: "center",
  },
  codeTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8,
  },
  codeHelp: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
  },
  codeCard: {
    backgroundColor: "#f0f3fa",
    borderRadius: 16,
    paddingVertical: 28,
    paddingHorizontal: 48,
    marginBottom: 12,
  },
  code: {
    fontSize: 44,
    fontWeight: "800",
    letterSpacing: 8,
    color: "#1a1a1a",
  },
});
