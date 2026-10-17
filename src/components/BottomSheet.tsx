// 공용 바텀시트
// - 배경 딤은 그라데이션으로 페이드인 (시트와 독립 애니메이션)
// - 시트는 아래에서 스프링으로 슬라이드업
// - 닫을 때 역재생 후 모달 숨김
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Modal,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";

interface BottomSheetProps {
  /** 표시 여부 */
  visible: boolean;
  /** 닫기 요청 (배경 탭 / 뒤로가기 / 닫기 애니메이션 완료 후 정리용) */
  onClose: () => void;
  /** 시트 내용 */
  children: React.ReactNode;
}

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

export function BottomSheet({ visible, onClose, children }: BottomSheetProps) {
  // 닫기 애니메이션 동안 모달 유지용 내부 상태
  const [showModal, setShowModal] = useState(visible);
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const sheetY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  useEffect(() => {
    if (visible) {
      setShowModal(true);
      Animated.parallel([
        Animated.timing(overlayOpacity, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.spring(sheetY, {
          toValue: 0,
          damping: 30,
          stiffness: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else if (showModal) {
      Animated.parallel([
        Animated.timing(overlayOpacity, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.timing(sheetY, {
          toValue: SCREEN_HEIGHT,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start(() => setShowModal(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  if (!showModal) return null;

  return (
    <Modal
      visible
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* 배경 그라데이션 딤 (페이드인) */}
        <Animated.View
          style={[StyleSheet.absoluteFill, { opacity: overlayOpacity }]}
          pointerEvents="none"
        >
          <LinearGradient
            colors={["rgba(51,46,41,0.55)", "rgba(51,46,41,0.12)"]}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
        {/* 배경 탭 → 닫기 */}
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        {/* 시트 (슬라이드업) */}
        <Animated.View
          style={[styles.sheet, { transform: [{ translateY: sheetY }] }]}
        >
          <View style={styles.handle} />
          {children}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 32,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#E8DDC9",
    alignSelf: "center",
    marginBottom: 12,
  },
});
