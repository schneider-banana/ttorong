// 홈 화면 (오늘 대시보드)
// - 상단: "오늘" 타이틀 + 오늘 날짜
// - 오늘의 가족 일정 (캘린더 데이터 재사용)
// - 육아 로그 입력 UI (기존 기록 탭에서 이전 — 수유 타이머, 원터치 버튼, 음성 버튼)
// - 하단: 오늘의 기록 타임라인
import { useCallback, useEffect, useMemo, useState } from "react";
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
import { EventList } from "../../src/components/calendar/EventList";
import { todayString } from "../../src/components/calendar/eventKind";
import { useBabyLog } from "../../src/hooks/useBabyLog";
import { useDatabase } from "../../src/hooks/useDatabase";
import { useAuth } from "../../src/hooks/useAuth";
import type { CalendarEvent } from "../../src/types";

/** "YYYY-MM-DD" → "10월 17일 (토)" */
function formatDateLabel(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  const weekdays = ["일", "월", "화", "수", "목", "금", "토"];
  const wd = weekdays[new Date(y, m - 1, d).getDay()];
  return `${m}월 ${d}일 (${wd})`;
}

export default function HomeScreen() {
  const log = useBabyLog();
  const db = useDatabase();
  const { member } = useAuth();
  const today = useMemo(() => todayString(), []);
  const [todayEvents, setTodayEvents] = useState<CalendarEvent[]>([]);

  // 오늘의 가족 일정 불러오기 (로그인 전에는 빈 목록)
  const loadTodayEvents = useCallback(async () => {
    if (!member) {
      setTodayEvents([]);
      return;
    }
    const list = await db.listEvents(member.familyId, today, today);
    setTodayEvents(list);
  }, [db, member, today]);

  useEffect(() => {
    void loadTodayEvents();
  }, [loadTodayEvents]);

  // 일정 삭제 후 목록 새로고침
  const handleDeleteEvent = useCallback(
    async (id: string) => {
      await db.deleteEvent(id);
      await loadTodayEvents();
    },
    [db, loadTodayEvents]
  );

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={log.refreshing}
            onRefresh={() => {
              void (async () => {
                await log.refresh();
                await loadTodayEvents();
              })();
            }}
          />
        }
      >
        <Text style={styles.title}>오늘</Text>
        <Text style={styles.dateLabel}>{formatDateLabel(today)}</Text>

        {/* 오늘의 가족 일정 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>오늘의 일정</Text>
          {todayEvents.length === 0 ? (
            <Text style={styles.emptyText}>오늘 일정이 없어요.</Text>
          ) : (
            <EventList
              date={today}
              events={todayEvents}
              onDeleteEvent={(id) => void handleDeleteEvent(id)}
            />
          )}
        </View>

        {/* 육아 로그 입력 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>육아 기록</Text>
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
        </View>

        {/* 오늘의 기록 타임라인 */}
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
  },
  dateLabel: {
    fontSize: 14,
    color: "#868E96",
    marginTop: 4,
    marginBottom: 16,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 14,
    color: "#868E96",
    paddingVertical: 8,
  },
  bottomSpace: {
    height: 32,
  },
});
