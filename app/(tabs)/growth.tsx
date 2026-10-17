// 성장 화면: 측정 입력 → 기록 목록(삭제 가능) → PDF 리포트 생성(프리미엄)
// - 숫자는 소수점 입력 가능 (decimal-pad)
// - 저장 버튼은 하나 이상의 측정값이 있을 때만 동작
import { useCallback, useState } from "react";
import {
  Alert,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useFocusEffect } from "expo-router";
import * as Print from "expo-print";
import { useCurrentChild } from "../../src/hooks/useCurrentChild";
import { useGrowth } from "../../src/hooks/useGrowth";
import { GrowthChart } from "../../src/components/GrowthChart";
import { PaywallSheet } from "../../src/components/PaywallSheet";
import { buildGrowthReportHtml } from "../../src/lib/report";
import { todayString } from "../../src/lib/vaccination";
import { isPremium } from "../../src/lib/premium";
import { colors } from "../../src/theme";
import type { GrowthRecord } from "../../src/types";

/** 측정일 형식 검증 (YYYY-MM-DD) */
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** 숫자 텍스트 파싱: 비어 있으면 undefined, 숫자가 아니면 NaN 표시용 null */
function parseNumber(raw: string): number | undefined {
  const trimmed = raw.trim();
  if (trimmed === "") return undefined;
  const value = parseFloat(trimmed);
  return Number.isFinite(value) ? value : NaN;
}

/** 기록 한 줄 요약: 입력된 값만 "키 80.5cm · 몸무게 9.2kg" 형태로 */
function summarize(record: GrowthRecord): string {
  const parts: string[] = [];
  if (record.heightCm !== undefined) parts.push(`키 ${record.heightCm}cm`);
  if (record.weightKg !== undefined) parts.push(`몸무게 ${record.weightKg}kg`);
  if (record.headCm !== undefined) parts.push(`머리둘레 ${record.headCm}cm`);
  return parts.join(" · ");
}

export default function GrowthScreen() {
  const growth = useGrowth();
  const { child } = useCurrentChild();

  const [measuredDate, setMeasuredDate] = useState(() => todayString());
  const [heightText, setHeightText] = useState("");
  const [weightText, setWeightText] = useState("");
  const [headText, setHeadText] = useState("");
  const [pdfBusy, setPdfBusy] = useState(false);
  const [premium, setPremium] = useState(false);
  const [paywallVisible, setPaywallVisible] = useState(false);

  // 탭 복귀 시 프리미엄 상태 새로고침 (결제 후 돌아온 경우 반영)
  useFocusEffect(
    useCallback(() => {
      void isPremium().then(setPremium);
    }, [])
  );

  /** 최신순 목록 */
  const latestFirst = [...growth.records].reverse();

  /** 입력값 초기화 */
  const clearForm = () => {
    setHeightText("");
    setWeightText("");
    setHeadText("");
  };

  /** 측정 저장 */
  const handleSave = () => {
    const date = measuredDate.trim();
    if (!DATE_RE.test(date)) {
      Alert.alert("입력 확인", "측정일을 YYYY-MM-DD 형식으로 입력해 주세요.");
      return;
    }
    const height = parseNumber(heightText);
    const weight = parseNumber(weightText);
    const head = parseNumber(headText);
    if (
      height === undefined &&
      weight === undefined &&
      head === undefined
    ) {
      Alert.alert(
        "입력 확인",
        "키, 몸무게, 머리둘레 중 하나 이상 입력해 주세요."
      );
      return;
    }
    if (Number.isNaN(height) || Number.isNaN(weight) || Number.isNaN(head)) {
      Alert.alert("입력 확인", "숫자만 입력해 주세요.");
      return;
    }
    growth.addRecord({
      measuredDate: date,
      ...(height !== undefined ? { heightCm: height } : {}),
      ...(weight !== undefined ? { weightKg: weight } : {}),
      ...(head !== undefined ? { headCm: head } : {}),
    });
    clearForm();
  };

  /** 기록 삭제 확인 */
  const confirmDelete = (record: GrowthRecord) => {
    Alert.alert(
      "기록 삭제",
      `${record.measuredDate} 측정 기록을 삭제할까요?`,
      [
        { text: "취소", style: "cancel" },
        {
          text: "삭제",
          style: "destructive",
          onPress: () => growth.deleteRecord(record.id),
        },
      ]
    );
  };

  /** PDF 리포트 만들기: 프리미엄 전용. 아이 정보 + 기록으로 HTML 생성 후 인쇄/공유 */
  const handlePdf = async () => {
    if (growth.busy || pdfBusy) return;
    if (!(await isPremium())) {
      setPaywallVisible(true);
      return;
    }
    if (growth.records.length === 0) {
      Alert.alert(
        "리포트 만들기",
        "저장된 성장 기록이 없습니다. 먼저 측정을 기록해 주세요."
      );
      return;
    }
    setPdfBusy(true);
    try {
      const html = buildGrowthReportHtml({
        childName: child?.name ?? "우리 아이",
        birthDate: child?.birthDate ?? null,
        records: growth.records,
        today: todayString(),
      });
      // 시스템 인쇄 대화상자에서 PDF 저장/공유 가능
      await Print.printAsync({ html });
    } catch {
      Alert.alert("오류", "PDF 생성 중 문제가 발생했습니다.");
    } finally {
      setPdfBusy(false);
    }
  };

  const saving = growth.busy || pdfBusy;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={growth.refreshing}
            onRefresh={growth.refresh}
          />
        }
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>성장</Text>

        {/* WHO 성장 곡선 (아이 성별이 등록돼 있으면 자동 반영) */}
        <GrowthChart
          key={child?.id ?? "nochild"}
          records={growth.records}
          birthDate={child?.birthDate ?? null}
          initialSex={child?.gender}
        />

        {/* 측정 입력 폼 */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>측정 기록</Text>
          <Text style={styles.label}>측정일 (YYYY-MM-DD)</Text>
          <TextInput
            style={styles.input}
            value={measuredDate}
            onChangeText={setMeasuredDate}
            placeholder="2026-10-17"
            keyboardType="numbers-and-punctuation"
            maxLength={10}
          />
          <View style={styles.row}>
            <View style={styles.field}>
              <Text style={styles.label}>키 (cm)</Text>
              <TextInput
                style={styles.input}
                value={heightText}
                onChangeText={setHeightText}
                placeholder="예: 80.5"
                keyboardType="decimal-pad"
              />
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>몸무게 (kg)</Text>
              <TextInput
                style={styles.input}
                value={weightText}
                onChangeText={setWeightText}
                placeholder="예: 9.2"
                keyboardType="decimal-pad"
              />
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>머리둘레 (cm)</Text>
              <TextInput
                style={styles.input}
                value={headText}
                onChangeText={setHeadText}
                placeholder="예: 44.0"
                keyboardType="decimal-pad"
              />
            </View>
          </View>
          <Pressable
            style={[styles.saveButton, saving && styles.disabled]}
            onPress={handleSave}
            disabled={saving}
          >
            <Text style={styles.saveButtonText}>저장</Text>
          </Pressable>
        </View>

        {/* 기록 목록 (최신순) */}
        <Text style={styles.sectionTitle}>기록 목록</Text>
        {growth.loading ? (
          <Text style={styles.hint}>불러오는 중…</Text>
        ) : latestFirst.length === 0 ? (
          <Text style={styles.hint}>
            아직 기록이 없습니다. 위에서 첫 측정을 저장해 보세요.
          </Text>
        ) : (
          latestFirst.map((record) => (
            <View key={record.id} style={styles.recordRow}>
              <View style={styles.recordInfo}>
                <Text style={styles.recordDate}>{record.measuredDate}</Text>
                <Text style={styles.recordSummary}>
                  {summarize(record)}
                </Text>
              </View>
              <Pressable
                style={styles.deleteButton}
                onPress={() => confirmDelete(record)}
                disabled={saving}
              >
                <Text style={styles.deleteButtonText}>삭제</Text>
              </Pressable>
            </View>
          ))
        )}

        {/* PDF 리포트 (프리미엄) */}
        <Pressable
          style={[styles.pdfButton, saving && styles.disabled]}
          onPress={() => void handlePdf()}
          disabled={saving}
        >
          <Text style={styles.pdfButtonText}>
            {pdfBusy
              ? "PDF 만드는 중…"
              : premium
                ? "PDF 리포트 만들기"
                : "🔒 PDF 리포트 만들기 (프리미엄)"}
          </Text>
        </Pressable>
        {!premium ? (
          <Text style={styles.premiumHint}>
            소아과 제출용 성장 리포트는 프리미엄 기능이에요.
          </Text>
        ) : null}

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
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 16,
  },
  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 12,
  },
  label: {
    fontSize: 13,
    color: colors.textSoft,
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.card,
    marginBottom: 12,
  },
  row: {
    flexDirection: "row",
    gap: 8,
  },
  field: {
    flex: 1,
  },
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: "center",
    marginTop: 4,
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 10,
  },
  hint: {
    fontSize: 14,
    color: colors.textSoft,
    marginBottom: 16,
  },
  recordRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  recordInfo: {
    flex: 1,
  },
  recordDate: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.text,
    marginBottom: 2,
  },
  recordSummary: {
    fontSize: 13,
    color: colors.textSoft,
  },
  deleteButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  deleteButtonText: {
    color: colors.danger,
    fontSize: 14,
    fontWeight: "600",
  },
  pdfButton: {
    backgroundColor: "#332E29",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 16,
  },
  premiumHint: {
    fontSize: 12,
    color: colors.textSoft,
    textAlign: "center",
    marginTop: 8,
  },
  pdfButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  disabled: {
    opacity: 0.5,
  },
  bottomSpace: {
    height: 32,
  },
});
