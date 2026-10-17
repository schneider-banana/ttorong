// 홈 화면 (오늘 대시보드) — 스크롤 없는 고정 레이아웃
// - 페이지 전체 스크롤 없음. 상단 고정 영역 + 하단 콘텐츠 영역(내부 스크롤만)
// - 상단: 컴팩트 헤더 → 상태 요약 카드 → 빠른 기록 한 줄(수유/수면/기저귀/체온+음성)
// - 세그먼트 [오늘 기록 | 오늘 일정] 전환으로 하나씩만 표시
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { LogTimeline } from "../../src/components/log/LogTimeline";
import { QuickLogButtons } from "../../src/components/log/QuickLogButtons";
import { TodaySummaryCard } from "../../src/components/log/TodaySummaryCard";
import { VoiceLogButton } from "../../src/components/log/VoiceLogButton";
import { EventList } from "../../src/components/calendar/EventList";
import { todayString } from "../../src/components/calendar/eventKind";
import { colors } from "../../src/theme";
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

/** 하단 콘텐츠 세그먼트 */
type HomeTab = "log" | "events";

export default function HomeScreen() {
  const log = useBabyLog();
  const db = useDatabase();
  const { member } = useAuth();
  const today = useMemo(() => todayString(), []);
  const [tab, setTab] = useState<HomeTab>("log");
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

  // 당겨서 새로고침: 로그 + 일정 함께 갱신
  const handleRefresh = useCallback(() => {
    void (async () => {
      await log.refresh();
      await loadTodayEvents();
    })();
  }, [log, loadTodayEvents]);

  const logActions = {
    onStartFeeding: log.startFeeding,
    onEndFeeding: log.endFeeding,
    onStartSleep: log.startSleep,
    onEndSleep: log.endSleep,
    onLogDiaper: log.logDiaper,
    onLogTemperature: log.logTemperature,
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        {/* 1. 컴팩트 헤더: "오늘 · 10월 17일 (토)" 한 줄 */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>오늘</Text>
          <Text style={styles.headerDate}>{formatDateLabel(today)}</Text>
        </View>

        {/* 2. 상태 요약 카드: 마지막 수유 + 오늘 통계 */}
        <TodaySummaryCard entries={log.todayEntries} />

        {/* 3. 빠른 기록 한 줄: 수유/수면/기저귀/체온 + 음성 마이크 */}
        <View style={styles.quickRow}>
          <View style={styles.quickButtonsWrap}>
            <QuickLogButtons
              compact
              activeFeeding={log.activeFeeding}
              activeSleep={log.activeSleep}
              disabled={log.busy}
              {...logActions}
            />
          </View>
          <VoiceLogButton
            compact
            disabled={log.busy}
            activeFeeding={log.activeFeeding}
            activeSleep={log.activeSleep}
            {...logActions}
          />
        </View>

        {/* 4. 세그먼트 전환: 오늘 기록 | 오늘 일정 */}
        <View style={styles.segment}>
          {(
            [
              { key: "log", label: "오늘 기록" },
              { key: "events", label: "오늘 일정" },
            ] as { key: HomeTab; label: string }[]
          ).map((item) => {
            const active = tab === item.key;
            return (
              <Pressable
                key={item.key}
                style={[styles.segmentItem, active && styles.segmentItemActive]}
                onPress={() => setTab(item.key)}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
              >
                <Text
                  style={[
                    styles.segmentLabel,
                    active && styles.segmentLabelActive,
                  ]}
                >
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* 5. 콘텐츠 영역: 남은 공간을 채우고, 넘칠 때만 내부 스크롤 */}
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentInner}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={log.refreshing} onRefresh={handleRefresh} />
          }
        >
          {tab === "log" ? (
            <LogTimeline
              entries={log.todayEntries}
              loading={log.loading}
              onDelete={log.deleteEntry}
            />
          ) : (
            <EventList
              date={today}
              events={todayEvents}
              showDateTitle={false}
              onDeleteEvent={(id) => void handleDeleteEvent(id)}
            />
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  // 페이지 전체는 고정 레이아웃 (스크롤 없음)
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  // 1. 컴팩트 헤더 (약 40pt)
  header: {
    flexDirection: "row",
    alignItems: "baseline",
    marginBottom: 10,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.text,
    marginRight: 8,
  },
  headerDate: {
    fontSize: 14,
    color: colors.textSoft,
  },
  // 3. 빠른 기록 한 줄 (약 78pt)
  quickRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
    marginBottom: 10,
    alignItems: "stretch",
  },
  quickButtonsWrap: {
    flex: 1,
  },
  // 4. 세그먼트 (약 46pt)
  segment: {
    flexDirection: "row",
    backgroundColor: "#F5EDE0",
    borderRadius: 12,
    padding: 4,
    marginBottom: 8,
  },
  segmentItem: {
    flex: 1,
    borderRadius: 9,
    paddingVertical: 9,
    alignItems: "center",
  },
  segmentItemActive: {
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  segmentLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textSoft,
  },
  segmentLabelActive: {
    color: colors.text,
    fontWeight: "700",
  },
  // 5. 콘텐츠 영역: 남은 공간 전부, 내부 스크롤만
  content: {
    flex: 1,
  },
  contentInner: {
    paddingBottom: 16,
  },
});
