// firebase/auth의 React Native 전용 API 타입 보강
// (@firebase/auth의 typings(auth-public.d.ts)에는 getReactNativePersistence
//  선언이 빠져 있어 tsc가 실패하므로 모듈 확장으로 보충합니다.
//  런타임에는 Metro가 react-native 조건으로 dist/rn 번들을 사용합니다.)
import type { Persistence } from "firebase/auth";
import type AsyncStorage from "@react-native-async-storage/async-storage";

declare module "firebase/auth" {
  export function getReactNativePersistence(
    storage: typeof AsyncStorage
  ): Persistence;
}
