// 커스텀 확인 다이얼로그 (삭제 확인 등)
// - 네이티브 Alert 대신 앱 디자인 시스템에 맞춘 중앙 다이얼로그
// - 배경 그라데이션 딤 페이드인 + 카드 스케일업
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { colors } from "../theme";

interface ConfirmDialogProps {
  /** 표시 여부 */
  visible: boolean;
  /** 제목 */
  title: string;
  /** 본문 */
  message: string;
  /** 확인 버튼 문구 (기본: 삭제) */
  confirmLabel?: string;
  /** 취소 버튼 문구 (기본: 취소) */
  cancelLabel?: string;
  /** true면 확인 버튼을 빨간색으로 */
  destructive?: boolean;
  /** 확인 */
  onConfirm: () => void;
  /** 취소 (배경 탭 / 뒤로가기 포함) */
  onCancel: () => void;
}

export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel = "삭제",
  cancelLabel = "취소",
  destructive = true,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const [showModal, setShowModal] = useState(visible);
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const cardScale = useRef(new Animated.Value(0.92)).current;

  useEffect(() => {
    if (visible) {
      setShowModal(true);
      Animated.parallel([
        Animated.timing(overlayOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(cardScale, {
          toValue: 1,
          damping: 22,
          stiffness: 320,
          useNativeDriver: true,
        }),
      ]).start();
    } else if (showModal) {
      Animated.parallel([
        Animated.timing(overlayOpacity, {
          toValue: 0,
          duration: 160,
          useNativeDriver: true,
        }),
        Animated.timing(cardScale, {
          toValue: 0.92,
          duration: 160,
          useNativeDriver: true,
        }),
      ]).start(() => setShowModal(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  if (!showModal) return null;

  return (
    <Modal visible transparent animationType="none" onRequestClose={onCancel}>
      <View style={styles.container}>
        <Animated.View
          style={[StyleSheet.absoluteFill, { opacity: overlayOpacity }]}
          pointerEvents="none"
        >
          <LinearGradient
            colors={["rgba(51,46,41,0.5)", "rgba(51,46,41,0.35)"]}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
        <Pressable style={StyleSheet.absoluteFill} onPress={onCancel} />
        <Animated.View
          style={[styles.card, { transform: [{ scale: cardScale }] }]}
        >
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          <View style={styles.buttons}>
            <Pressable
              style={({ pressed }) => [
                styles.button,
                styles.cancelButton,
                pressed && styles.pressed,
              ]}
              onPress={onCancel}
            >
              <Text style={styles.cancelText}>{cancelLabel}</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.button,
                destructive ? styles.dangerButton : styles.primaryButton,
                pressed && styles.pressed,
              ]}
              onPress={onConfirm}
            >
              <Text style={styles.confirmText}>{confirmLabel}</Text>
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
  },
  card: {
    width: "100%",
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
    textAlign: "center",
    marginBottom: 10,
  },
  message: {
    fontSize: 15,
    color: colors.textSoft,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 20,
  },
  buttons: {
    flexDirection: "row",
    gap: 10,
  },
  button: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dangerButton: {
    backgroundColor: colors.danger,
  },
  primaryButton: {
    backgroundColor: colors.primary,
  },
  cancelText: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.textSoft,
  },
  confirmText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  pressed: {
    opacity: 0.7,
  },
});
