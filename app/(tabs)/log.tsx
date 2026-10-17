// 육아 로그 화면 (원터치 기록)
// - 상단: 마지막 수유 경과시간 (1분마다 갱신)
// - 중단: 수유/수면/기저귀/체온 원터치 버튼
// - 하단: 오늘의 기록 타임라인 (삭제 가능)
import {
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { FeedingTimer } from "../../src/components/log/FeedingTimer";
import { LogTimeline } from "../../src/components/log/LogTimeline";
import { QuickLogButtons } from "../../src/components/log/QuickLogButtons";
import { VoiceLogButton } from "../../src/components/log/VoiceLogButton";
import { useBabyLog } from "../../src/hooks/useBabyLog";

export default function LogScreen() {
  const log = useBabyLog();

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={log.refreshing} onRefresh={log.refresh} />
        }
      >
        <Text style={styles.title}>기록</Text>

        <FeedingTimer lastFeeding={log.lastFeeding} />

        <QuickLogButtons
          activeFeeding={log.activeFeeding}
          activeSleep={log.activeSleep}
          disabled={log.busy}
          onStartFeeding={log.startFeeding}
          onEndFeeding={log.endFeeding}
          onStartSleep={log.startSleep}
          onEndSleep={log.endSleep}
          onLogDiaper={log.logDiaper}
          onLogTemperature={log.logTemperature}
        />

        <VoiceLogButton
          disabled={log.busy}
          activeFeeding={log.activeFeeding}
          activeSleep={log.activeSleep}
          onStartFeeding={log.startFeeding}
          onEndFeeding={log.endFeeding}
          onStartSleep={log.startSleep}
          onEndSleep={log.endSleep}
          onLogDiaper={log.logDiaper}
          onLogTemperature={log.logTemperature}
        />

        <LogTimeline
          entries={log.todayEntries}
          loading={log.loading}
          onDelete={log.deleteEntry}
        />

        <View style={styles.bottomSpace} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#fff",
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#333",
    marginBottom: 16,
  },
  bottomSpace: {
    height: 32,
  },
});
