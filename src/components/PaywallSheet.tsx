// 프리미엄 결제 페이월 (공용 BottomSheet 기반)
// - 월/연 플랜 선택 → RevenueCat 구매 → onUnlocked
// - API Key 미설정(목 모드)이면 "결제 준비 중" 안내
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { BottomSheet } from "./BottomSheet";
import { colors, radius } from "../theme";
import {
  PRODUCTS,
  isMockMode,
  purchaseProduct,
  restorePurchases,
} from "../lib/purchases";

interface PaywallSheetProps {
  visible: boolean;
  onClose: () => void;
  /** 결제(또는 복원) 성공 시 */
  onUnlocked: () => void;
}

type Plan = "monthly" | "yearly";

const PLANS: Record<
  Plan,
  { productId: string; label: string; price: string; note: string }
> = {
  monthly: {
    productId: PRODUCTS.premiumMonthly,
    label: "월간",
    price: "월 4,900원",
    note: "매월 자동 결제",
  },
  yearly: {
    productId: PRODUCTS.premiumYearly,
    label: "연간",
    price: "연 39,000원",
    note: "월 3,250원 꼴 · 33% 할인",
  },
};

const BENEFITS = [
  { icon: "picture-as-pdf", text: "성장 리포트 PDF 무제한 만들기" },
  { icon: "child-care", text: "아이 무제한 등록 (무료는 1명)" },
] as const;

export function PaywallSheet({ visible, onClose, onUnlocked }: PaywallSheetProps) {
  const [plan, setPlan] = useState<Plan>("yearly");
  const [busy, setBusy] = useState(false);
  const meta = PLANS[plan];

  const buy = async () => {
    if (isMockMode()) {
      Alert.alert(
        "결제 준비 중",
        "스토어 출시 후 이용할 수 있어요. (현재 테스트 모드)"
      );
      return;
    }
    setBusy(true);
    try {
      const ok = await purchaseProduct(meta.productId);
      if (ok) {
        onUnlocked();
        onClose();
      }
    } finally {
      setBusy(false);
    }
  };

  const restore = async () => {
    setBusy(true);
    try {
      const ok = await restorePurchases();
      if (ok) {
        onUnlocked();
        onClose();
      } else {
        Alert.alert("구매 복원", "복원할 구매 내역이 없어요.");
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <View style={styles.header}>
        <View style={styles.iconBadge}>
          <MaterialIcons name="workspace-premium" size={36} color={colors.primary} />
        </View>
        <Text style={styles.title}>또롱이 프리미엄</Text>
        <Text style={styles.subtitle}>육아 기록을 더 알차게</Text>
      </View>

      {BENEFITS.map((b) => (
        <View key={b.text} style={styles.benefitRow}>
          <MaterialIcons name={b.icon} size={20} color={colors.primaryDeep} />
          <Text style={styles.benefitText}>{b.text}</Text>
        </View>
      ))}

      <View style={styles.planRow}>
        {(Object.keys(PLANS) as Plan[]).map((key) => {
          const p = PLANS[key];
          const active = plan === key;
          return (
            <Pressable
              key={key}
              style={[styles.planCard, active && styles.planCardActive]}
              onPress={() => setPlan(key)}
            >
              <Text style={[styles.planLabel, active && styles.planLabelActive]}>
                {p.label}
              </Text>
              <Text style={[styles.planPrice, active && styles.planPriceActive]}>
                {p.price}
              </Text>
              <Text style={styles.planNote}>{p.note}</Text>
            </Pressable>
          );
        })}
      </View>

      <Pressable
        style={[styles.cta, busy && styles.disabled]}
        onPress={() => void buy()}
        disabled={busy}
      >
        {busy ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.ctaText}>구매하기</Text>
        )}
      </Pressable>
      <Pressable style={styles.subButton} onPress={() => void restore()} disabled={busy}>
        <Text style={styles.subButtonText}>구매 복원</Text>
      </Pressable>
      <Pressable style={styles.subButton} onPress={onClose}>
        <Text style={[styles.subButtonText, styles.closeText]}>닫기</Text>
      </Pressable>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: "center", marginBottom: 16 },
  iconBadge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  title: { fontSize: 22, fontWeight: "800", color: colors.text },
  subtitle: { fontSize: 14, color: colors.textSoft, marginTop: 4 },
  benefitRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.primarySoft,
    borderRadius: radius.md,
    padding: 12,
    marginBottom: 8,
  },
  benefitText: { fontSize: 14, fontWeight: "600", color: colors.text },
  planRow: { flexDirection: "row", gap: 10, marginVertical: 12 },
  planCard: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: 14,
    alignItems: "center",
    backgroundColor: colors.card,
  },
  planCardActive: { borderColor: colors.primary, backgroundColor: "#FFF9F1" },
  planLabel: { fontSize: 13, fontWeight: "700", color: colors.textSoft },
  planLabelActive: { color: colors.primaryDeep },
  planPrice: { fontSize: 17, fontWeight: "800", color: colors.text, marginTop: 4 },
  planPriceActive: { color: colors.primaryDeep },
  planNote: { fontSize: 11, color: colors.textSoft, marginTop: 4, textAlign: "center" },
  cta: {
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 4,
  },
  disabled: { opacity: 0.6 },
  ctaText: { fontSize: 17, fontWeight: "800", color: "#FFFFFF" },
  subButton: { paddingVertical: 10, alignItems: "center" },
  subButtonText: { fontSize: 14, fontWeight: "700", color: colors.primaryDeep },
  closeText: { color: colors.textSoft, fontWeight: "600" },
});
