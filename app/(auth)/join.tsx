// 초대코드로 참여하기 화면
// - 6자리 초대코드 + 내 이름 입력 → 검증 후 가족 합류
// - 코드가 틀리면 한국어 에러 메시지 표시
import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { router } from "expo-router";
import { colors } from "../../src/theme";
import { useAuth } from "../../src/hooks/useAuth";
import { INVITE_CODE_LENGTH } from "../../src/lib/auth";

export default function AuthJoinScreen() {
  const { joinFamily } = useAuth();
  const [inviteCode, setInviteCode] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  /** 초대코드 제출 → 가족 합류 */
  const handleJoin = async () => {
    if (submitting) return;
    setError("");
    setSubmitting(true);
    try {
      await joinFamily(inviteCode, displayName);
      // 합류 성공 → 탭 화면 진입 (뒤로가기로 인증 화면 복귀 방지)
      router.replace("/(tabs)");
    } catch (e) {
      setError(e instanceof Error ? e.message : "다시 시도해 주세요.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>초대코드로 참여하기</Text>
      <Text style={styles.subtitle}>
        가족에게 받은 6자리 초대코드를 입력해 주세요.
      </Text>

      <Text style={styles.label}>초대코드 (6자리)</Text>
      <TextInput
        style={styles.codeInput}
        placeholder="예: A3K9QZ"
        value={inviteCode}
        onChangeText={(text) => setInviteCode(text.toUpperCase())}
        autoCapitalize="characters"
        autoCorrect={false}
        maxLength={INVITE_CODE_LENGTH}
        autoFocus
      />

      <Text style={styles.label}>내 이름</Text>
      <TextInput
        style={styles.input}
        placeholder="예: 아빠"
        value={displayName}
        onChangeText={setDisplayName}
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable
        style={[styles.button, styles.primaryButton]}
        onPress={handleJoin}
        disabled={submitting}
      >
        {submitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.primaryButtonText}>참여하기</Text>
        )}
      </Pressable>
      <Pressable
        style={styles.backLink}
        onPress={() => router.back()}
        disabled={submitting}
      >
        <Text style={styles.backLinkText}>← 돌아가기</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 28,
    backgroundColor: colors.background,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    textAlign: "center",
    color: colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: colors.textSoft,
    textAlign: "center",
    marginBottom: 32,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
    marginTop: 12,
    marginBottom: 6,
  },
  codeInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 24,
    fontWeight: "700",
    letterSpacing: 4,
    textAlign: "center",
    color: colors.text,
    backgroundColor: colors.card,
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.card,
    marginBottom: 4,
  },
  error: {
    color: colors.danger,
    fontSize: 14,
    marginTop: 12,
    lineHeight: 20,
  },
  button: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 16,
  },
  primaryButton: {
    backgroundColor: colors.primary,
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  backLink: {
    alignItems: "center",
    marginTop: 16,
    paddingVertical: 8,
  },
  backLinkText: {
    color: colors.textSoft,
    fontSize: 14,
  },
});
