// 공용 바텀시트
// - 배경 딤은 그라데이션으로 페이드인 (시트와 독립 애니메이션)
// - 시트는 아래에서 스프링으로 슬라이드업
// - 손잡이 드래그로 닫기, 내용은 스크롤 가능
// - 닫을 때 역재생 후 모달 숨김
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";

interface BottomSheetProps {
  /** 표시 여부 */
  visible: boolean;
  /** 닫기 요청 (배경 탭 / 뒤로가기 / 드래그) */
  onClose: () => void;
  /** 시트 내용 */
  children: React.ReactNode;
}

const { height: SCREEN_HEIGHT } = Dimensions.get("window");
/** 드래그로 닫히는 임계값 */
const DISMISS_THRESHOLD = 110;

export function BottomSheet({ visible, onClose, children }: BottomSheetProps) {
  // 닫기 애니메이션 동안 모달 유지용 내부 상태
  const [showModal, setShowModal] = useState(visible);
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const sheetY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const dragY = useRef(new Animated.Value(0)).current;

  const playClose = () => {
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
    ]).start(() => {
      dragY.setValue(0);
      setShowModal(false);
    });
  };

  useEffect(() => {
    if (visible) {
      setShowModal(true);
      dragY.setValue(0);
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
      playClose();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  // 손잡이 드래그로 닫기
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gesture) =>
        gesture.dy > 10 && Math.abs(gesture.dy) > Math.abs(gesture.dx) * 1.5,
      onPanResponderMove: (_, gesture) => {
        if (gesture.dy > 0) dragY.setValue(gesture.dy);
      },
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dy > DISMISS_THRESHOLD || gesture.vy > 0.9) {
          onClose();
        } else {
          Animated.spring(dragY, {
            toValue: 0,
            damping: 25,
            stiffness: 300,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  if (!showModal) return null;

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
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
        {/* 시트 (슬라이드업 + 드래그) */}
        <Animated.View
          style={[
            styles.sheet,
            { transform: [{ translateY: Animated.add(sheetY, dragY) }] },
          ]}
        >
          <View style={styles.handleZone} {...panResponder.panHandlers}>
            <View style={styles.handle} />
          </View>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
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
    paddingBottom: 32,
    maxHeight: SCREEN_HEIGHT * 0.88,
  },
  handleZone: {
    paddingVertical: 12,
    alignItems: "center",
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#E8DDC9",
  },
  scrollContent: {
    paddingBottom: 8,
  },
});
