// 설정 화면: 프리미엄 · 아이 관리(성별 포함) · 가족 초대코드 · 데이터 모드
import { useCallback, useState } from "react";
import {
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useFocusEffect } from "expo-router";
import * as Clipboard from "expo-clipboard";
import { MaterialIcons } from "@expo/vector-icons";
import { PaywallSheet } from "../../src/components/PaywallSheet";
import { colors, radius } from "../../src/theme";
import { useDatabase } from "../../src/hooks/useDatabase";
import { useCurrentChild } from "../../src/hooks/useCurrentChild";
import { useAuth } from "../../src/hooks/useAuth";
import { firebaseMode } from "../../src/lib/firebase";
import { FREE_CHILD_LIMIT, isPremium } from "../../src/lib/premium";
import { isMockMode, restorePurchases } from "../../src/lib/purchases";
import type { Child } from "../../src/types";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** "YYYY-MM-DD" 형식이 실제 존재하는 날짜인지 검사 */
function isValidDateString(value: string): boolean {
  if (!DATE_PATTERN.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return (
    date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d
  );
}

type GenderChoice = Child["gender"] | undefined;

const GENDER_OPTIONS: { key: Exclude<GenderChoice, undefined>; label: string }[] = [
  { key: "male", label: "남아" },
  { key: "female", label: "여아" },
];

export default function SettingsScreen() {
  const db = useDatabase();
  const { member } = useAuth();
  const { children, reload: reloadChildren } = useCurrentChild();
  const [name, setName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [gender, setGender] = useState<GenderChoice>(undefined);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [premium, setPremium] = useState(false);
  const [paywallVisible, setPaywallVisible] = useState(false);
  const [restoring, setRestoring] = useState(false);

  // 탭 복귀 시 프리미엄 상태 + 초대코드 새로고침
  useFocusEffect(
    useCallback(() => {
      void isPremium().then(setPremium);
      const familyId = member?.familyId;
      if (!familyId) {
        setInviteCode(null);
        return;
      }
      let cancelled = false;
      db.getFamily(familyId)
        .then((family) => {
          if (!cancelled) setInviteCode(family?.inviteCode ?? null);
        })
        .catch(() => {
          if (!cancelled) setInviteCode(null);
        });
      return () => {
        cancelled = true;
      };
    }, [db, member?.familyId])
  );

  /** 초대코드를 클립보드에 복사 */
  const handleCopyInviteCode = async () => {
    if (!inviteCode) return;
    await Clipboard.setStringAsync(inviteCode);
    Alert.alert("복사됨", "초대코드가 클립보드에 복사됐어요.");
  };

  // 아이 등록 (무료는 1명까지, 그 이상은 프리미엄)
  const handleAddChild = async () => {
    const trimmedName = name.trim();
    const trimmedDate = birthDate.trim();
    if (!trimmedName) {
      Alert.alert("입력 확인", "아이 이름을 입력해주세요.");
      return;
    }
    if (!isValidDateString(trimmedDate)) {
      Alert.alert(
        "입력 확인",
        "생년월일을 YYYY-MM-DD 형식으로 입력해주세요. (예: 2025-03-14)"
      );
      return;
    }
    if (children.length >= FREE_CHILD_LIMIT && !(await isPremium())) {
      setPaywallVisible(true);
      return;
    }
    try {
      await db.createChild({
        name: trimmedName,
        birthDate: trimmedDate,
        ...(gender ? { gender } : {}),
      });
      setName("");
      setBirthDate("");
      setGender(undefined);
      await reloadChildren();
    } catch (e) {
      Alert.alert(
        "등록 실패",
        `아이를 등록하지 못했어요. (${e instanceof Error ? e.message : "알 수 없는 오류"})`
      );
    }
  };

  const handleRestore = async () => {
    if (isMockMode()) {
      Alert.alert("구매 복원", "스토어 출시 후 이용할 수 있어요.");
      return;
    }
    setRestoring(true);
    try {
      const ok = await restorePurchases();
      if (ok) {
        setPremium(true);
        Alert.alert("복원 완료", "프리미엄이 복원됐어요.");
      } else {
        Alert.alert("구매 복원", "복원할 구매 내역이 없어요.");
      }
    } finally {
      setRestoring(false);
    }
  };

  const atChildLimit = children.length >= FREE_CHILD_LIMIT && !premium;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>설정</Text>

        {/* 프리미엄 */}
        <View style={styles.card}>
          <View style={styles.premiumRow}>
            <View style={styles.premiumIcon}>
              <MaterialIcons
                name="workspace-premium"
                size={24}
                color={premium ? colors.primary : colors.inactive}
              />
            </View>
            <View style={styles.premiumInfo}>
              <Text style={styles.premiumTitle}>
                {premium ? "프리미엄 이용 중" : "무료 플랜"}
              </Text>
              <Text style={styles.premiumDesc}>
                {premium
                  ? "PDF 리포트 · 아이 무제한 등록"
                  : "PDF 리포트 · 아이 2명째부터 프리미엄"}
              </Text>
            </View>
          </View>
          {premium ? (
            <Pressable
              style={styles.secondaryButton}
              onPress={() => void handleRestore()}
              disabled={restoring}
            >
              <Text style={styles.secondaryButtonText}>
                {restoring ? "확인 중…" : "구매 복원"}
              </Text>
            </Pressable>
          ) : (
            <Pressable
              style={styles.primaryButton}
              onPress={() => setPaywallVisible(true)}
            >
              <Text style={styles.primaryButtonText}>프리미엄 알아보기</Text>
            </Pressable>
          )}
        </View>

        {/* 아이 관리 */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>아이 관리</Text>
          {children.length === 0 ? (
            <Text style={styles.emptyText}>등록된 아이가 없어요.</Text>
          ) : (
            children.map((child) => (
              <View key={child.id} style={styles.childRow}>
                <View style={styles.childInfo}>
                  <Text style={styles.childName}>{child.name}</Text>
                  <Text style={styles.childBirth}>
                    {child.birthDate}
                    {child.gender === "male"
                      ? " · 남아"
                      : child.gender === "female"
                        ? " · 여아"
                        : ""}
                  </Text>
                </View>
              </View>
            ))
          )}
          <TextInput
            style={styles.input}
            placeholder="이름"
            value={name}
            onChangeText={setName}
            placeholderTextColor={colors.inactive}
          />
          <TextInput
            style={styles.input}
            placeholder="생년월일 (YYYY-MM-DD)"
            value={birthDate}
            onChangeText={setBirthDate}
            keyboardType="numbers-and-punctuation"
            maxLength={10}
            placeholderTextColor={colors.inactive}
          />
          <View style={styles.genderRow}>
            {GENDER_OPTIONS.map((opt) => {
              const active = gender === opt.key;
              return (
                <Pressable
                  key={opt.key}
                  style={[styles.genderChip, active && styles.genderChipActive]}
                  onPress={() => setGender(active ? undefined : opt.key)}
                >
                  <Text
                    style={[
                      styles.genderChipText,
                      active && styles.genderChipTextActive,
                    ]}
                  >
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
            <Text style={styles.genderHint}>성장 곡선에 반영돼요</Text>
          </View>
          <Pressable
            style={styles.primaryButton}
            onPress={() => void handleAddChild()}
            accessibilityLabel="아이 등록"
          >
            <Text style={styles.primaryButtonText}>
              {atChildLimit ? "🔒 아이 등록 (프리미엄)" : "아이 등록"}
            </Text>
          </Pressable>
          {atChildLimit ? (
            <Text style={styles.limitHint}>
              무료는 아이 1명까지 등록할 수 있어요.
            </Text>
          ) : null}
        </View>

        {/* 가족 초대코드 */}
        {inviteCode ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>가족 초대코드</Text>
            <Text style={styles.hintText}>
              가족을 초대할 때 이 코드를 알려주세요.
            </Text>
            <View style={styles.inviteRow}>
              <Text style={styles.inviteCode}>{inviteCode}</Text>
              <Pressable
                style={styles.copyButton}
                onPress={() => void handleCopyInviteCode()}
                accessibilityLabel="초대코드 복사"
              >
                <Text style={styles.copyButtonText}>복사</Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        {/* 데이터 모드 */}
        <View style={styles.modeBox}>
          <Text style={styles.modeLabel}>데이터 모드</Text>
          <Text style={styles.modeValue}>
            {firebaseMode === "mock"
              ? "인메모리 mock (Firebase 키 없음)"
              : "Firebase 연결됨"}
          </Text>
        </View>

        <View style={styles.bottomSpace} />
      </ScrollView>

      <PaywallSheet
        visible={paywallVisible}
        onClose={() => setPaywallVisible(false)}
        onUnlocked={() => setPremium(true)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  content: { padding: 16 },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: colors.text,
    marginBottom: 16,
  },
  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.text,
    marginBottom: 12,
  },
  /* 프리미엄 */
  premiumRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  premiumIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  premiumInfo: { flex: 1 },
  premiumTitle: { fontSize: 16, fontWeight: "800", color: colors.text },
  premiumDesc: { fontSize: 13, color: colors.textSoft, marginTop: 4 },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 13,
    alignItems: "center",
  },
  primaryButtonText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
  secondaryButton: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: 12,
    alignItems: "center",
  },
  secondaryButtonText: {
    color: colors.textSoft,
    fontSize: 14,
    fontWeight: "700",
  },
  /* 아이 관리 */
  emptyText: { fontSize: 14, color: colors.textSoft, marginBottom: 12 },
  childRow: {
    backgroundColor: colors.background,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
  },
  childInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  childName: { fontSize: 15, fontWeight: "700", color: colors.text },
  childBirth: { fontSize: 13, color: colors.textSoft },
  input: {
    backgroundColor: colors.background,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 15,
    color: colors.text,
    marginBottom: 8,
  },
  genderRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
  genderChip: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.round,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  genderChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  genderChipText: { fontSize: 14, fontWeight: "700", color: colors.textSoft },
  genderChipTextActive: { color: colors.primaryDeep },
  genderHint: { fontSize: 12, color: colors.inactive, marginLeft: 4 },
  limitHint: {
    fontSize: 12,
    color: colors.textSoft,
    textAlign: "center",
    marginTop: 8,
  },
  /* 초대코드 */
  hintText: { fontSize: 13, color: colors.textSoft, marginBottom: 10 },
  inviteRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  inviteCode: {
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: 4,
    color: colors.text,
  },
  copyButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  copyButtonText: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
  /* 데이터 모드 */
  modeBox: {
    alignItems: "center",
    backgroundColor: "#F5EDE0",
    borderRadius: radius.lg,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  modeLabel: { fontSize: 12, color: colors.textSoft, marginBottom: 4 },
  modeValue: { fontSize: 15, fontWeight: "700", color: colors.text },
  bottomSpace: { height: 32 },
});
