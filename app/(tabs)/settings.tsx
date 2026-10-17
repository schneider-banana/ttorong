// 설정 화면 (데이터 연결 모드 표시 + 아이 관리 포함)
import { useEffect, useState } from "react";
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import { PlaceholderScreen } from "../../src/components/PlaceholderScreen";
import { useDatabase } from "../../src/hooks/useDatabase";
import { useCurrentChild } from "../../src/hooks/useCurrentChild";
import { useAuth } from "../../src/hooks/useAuth";
import { firebaseMode } from "../../src/lib/firebase";

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

export default function SettingsScreen() {
  const db = useDatabase();
  const { member } = useAuth();
  const { children, reload: reloadChildren } = useCurrentChild();
  const [name, setName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [inviteCode, setInviteCode] = useState<string | null>(null);

  // 내 가족의 초대코드를 불러옵니다 (가족 초대용)
  useEffect(() => {
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
  }, [db, member?.familyId]);

  /** 초대코드를 클립보드에 복사 */
  const handleCopyInviteCode = async () => {
    if (!inviteCode) return;
    await Clipboard.setStringAsync(inviteCode);
    Alert.alert("복사됨", "초대코드가 클립보드에 복사됐어요.");
  };

  // 아이 목록은 useCurrentChild가 자동으로 불러옵니다.
  // (불러오기 실패 시 빈 목록 표시 — 조용히 대기)

  // 아이 등록
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
    try {
      await db.createChild({ name: trimmedName, birthDate: trimmedDate });
      setName("");
      setBirthDate("");
      await reloadChildren();
    } catch (e) {
      Alert.alert(
        "등록 실패",
        `아이를 등록하지 못했어요. (${e instanceof Error ? e.message : "알 수 없는 오류"})`
      );
    }
  };

  return (
    <PlaceholderScreen
      title="설정"
      description="아이·가족 관리, 알림 설정 등 앱 설정이 여기에 표시됩니다."
    >
      {/* 아이 관리 */}
      <View style={styles.childBox}>
        <Text style={styles.sectionTitle}>아이 관리</Text>
        {children.length === 0 ? (
          <Text style={styles.emptyText}>등록된 아이가 없어요.</Text>
        ) : (
          children.map((child) => (
            <View key={child.id} style={styles.childRow}>
              <Text style={styles.childName}>{child.name}</Text>
              <Text style={styles.childBirth}>{child.birthDate}</Text>
            </View>
          ))
        )}
        <TextInput
          style={styles.input}
          placeholder="이름"
          value={name}
          onChangeText={setName}
        />
        <TextInput
          style={styles.input}
          placeholder="생년월일 (YYYY-MM-DD)"
          value={birthDate}
          onChangeText={setBirthDate}
          keyboardType="numbers-and-punctuation"
          maxLength={10}
        />
        <Pressable
          style={styles.addButton}
          onPress={() => void handleAddChild()}
          accessibilityLabel="아이 등록"
        >
          <Text style={styles.addButtonText}>아이 등록</Text>
        </Pressable>
      </View>

      {/* 가족 초대코드 */}
      {inviteCode ? (
        <View style={styles.inviteBox}>
          <Text style={styles.sectionTitle}>가족 초대코드</Text>
          <Text style={styles.inviteHint}>
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

      <View style={styles.modeBox}>
        <Text style={styles.modeLabel}>데이터 모드</Text>
        <Text style={styles.modeValue}>
          {firebaseMode === "mock"
            ? "인메모리 mock (Firebase 키 없음)"
            : "Firebase 연결됨"}
        </Text>
      </View>
    </PlaceholderScreen>
  );
}

const styles = StyleSheet.create({
  // PlaceholderScreen이 가운데 정렬이므로 좌우 전체 폭 사용
  childBox: {
    width: "100%",
    marginTop: 24,
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 14,
    color: "#868E96",
    marginBottom: 12,
  },
  childRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
  },
  childName: {
    fontSize: 15,
    fontWeight: "600",
  },
  childBirth: {
    fontSize: 14,
    color: "#868E96",
  },
  input: {
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#DEE2E6",
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    marginBottom: 8,
  },
  addButton: {
    backgroundColor: "#2563eb",
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 4,
  },
  addButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },
  inviteBox: {
    width: "100%",
    marginTop: 16,
    backgroundColor: "#FFF9E6",
    borderRadius: 12,
    padding: 16,
  },
  inviteHint: {
    fontSize: 13,
    color: "#868E96",
    marginBottom: 10,
  },
  inviteRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  inviteCode: {
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: 4,
  },
  copyButton: {
    backgroundColor: "#2563eb",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  copyButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  modeBox: {
    width: "100%",
    marginTop: 16,
    alignItems: "center",
    backgroundColor: "#F1F3F5",
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  modeLabel: {
    fontSize: 12,
    color: "#868E96",
    marginBottom: 4,
  },
  modeValue: {
    fontSize: 15,
    fontWeight: "600",
  },
});
