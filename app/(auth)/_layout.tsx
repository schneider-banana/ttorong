// 인증 그룹 레이아웃: 시작 / 가족 만들기 / 초대코드로 참여하기 화면을 묶는 스택
import { Stack } from "expo-router";

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="join" />
    </Stack>
  );
}
