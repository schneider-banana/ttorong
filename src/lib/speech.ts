// 음성 인식(STT) provider 인터페이스 + 목(mock) 구현체
// - 현재는 Expo Go 호환을 위해 실제 STT를 쓰지 않고 목 provider로 시뮬레이션합니다.
// - TODO(실제 STT 연동 지점): expo-speech는 TTS(음성 합성) 전용이라 STT로 쓸 수 없습니다.
//   실제 음성 인식을 붙이려면 @react-native-voice/voice 같은 네이티브 모듈이 필요하고
//   개발 빌드(dev build)가 필수이므로, 그때 이 인터페이스를 구현한 실 provider로 교체할 것.
//   교체 지점은 사용처(VoiceLogButton)가 provider를 생성하는 한 곳뿐입니다.

/** 음성 인식 provider가 지켜야 할 최소 계약 */
export interface SpeechRecognitionProvider {
  /** 이 기기에서 음성 인식을 쓸 수 있는지 (권한 포함) */
  isAvailable(): Promise<boolean>;
  /** 듣기 시작. 인식된 텍스트는 onResult, 실패는 onError로 전달 */
  startListening(
    onResult: (text: string) => void,
    onError: (message: string) => void
  ): Promise<void>;
  /** 듣기 중단 (대기 중인 결과 취소) */
  stopListening(): Promise<void>;
}

/**
 * 목(mock) 음성 인식이 시뮬레이션으로 반환하는 데모 명령어 후보 목록.
 * startListening 호출 후 이 중 하나가 인식된 것처럼 onResult로 전달됩니다.
 */
export const MOCK_DEMO_COMMANDS: string[] = [
  "수유 시작",
  "수유 끝",
  "수면 시작",
  "기저귀 소변",
  "체온 37.5도",
];

/** 목(mock) STT 구현체: 약 2초 뒤 데모 명령어 하나를 인식된 것처럼 반환 */
export class MockSpeechRecognitionProvider
  implements SpeechRecognitionProvider
{
  /** 대기 중인 인식 타이머 (stopListening/언마운트 시 취소) */
  private timer: ReturnType<typeof setTimeout> | null = null;

  /** mock은 항상 사용 가능 */
  async isAvailable(): Promise<boolean> {
    return true;
  }

  async startListening(
    onResult: (text: string) => void,
    _onError: (message: string) => void
  ): Promise<void> {
    // 연속 호출 시 이전 대기는 취소 (mock이므로 에러 시뮬레이션 없음)
    this.clearTimer();
    // 약 2초 뒤 후보 중 하나를 무작위로 "인식된" 것처럼 전달
    this.timer = setTimeout(() => {
      this.timer = null;
      const picked =
        MOCK_DEMO_COMMANDS[
          Math.floor(Math.random() * MOCK_DEMO_COMMANDS.length)
        ];
      onResult(picked);
    }, 2000);
  }

  async stopListening(): Promise<void> {
    this.clearTimer();
  }

  private clearTimer(): void {
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }
}
