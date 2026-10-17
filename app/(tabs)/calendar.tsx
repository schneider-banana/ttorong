// 캘린더 화면 (공유 가족 캘린더)
// - 월간 그리드 (월 이동, 오늘 하이라이트, 종류별 색상 점)
// - 날짜 탭 → 해당 날짜 일정 목록
// - + 버튼 → 일정 입력 폼 (모달)
// - 일정 길게 누르기 → 삭제 확인
// - familyId는 로그인 세션(useAuth)에서 가져옵니다.
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useDatabase } from "../../src/hooks/useDatabase";
import { useAuth } from "../../src/hooks/useAuth";
import { useCurrentChild } from "../../src/hooks/useCurrentChild";
import { useVaccination } from "../../src/hooks/useVaccination";
import { doseStatusLabel, formatDday } from "../../src/lib/vaccination";
import type { CalendarEvent } from "../../src/types";
import { EventForm, type EventFormValue } from "../../src/components/calendar/EventForm";
import { EventList } from "../../src/components/calendar/EventList";
import { MonthGrid } from "../../src/components/calendar/MonthGrid";
import {
  monthRange,
  toDateString,
  todayString,
} from "../../src/components/calendar/eventKind";

export default function CalendarScreen() {
  const db = useDatabase();
  const { member } = useAuth();
  const today = useMemo(() => todayString(), []);

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1); // 1~12
  const [selectedDate, setSelectedDate] = useState(today);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [formVisible, setFormVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  // 아이 목록 (예방접종 섹션용 — 첫 번째 아이 기준)
  const { child } = useCurrentChild();
  const [syncing, setSyncing] = useState(false);

  const { upcoming, syncToCalendar } = useVaccination(child);

  // 예방접종 일정 자동 등록
  const handleSyncVaccinations = async () => {
    setSyncing(true);
    try {
      const { created, skipped } = await syncToCalendar();
      Alert.alert(
        "자동 등록 완료",
        `${created}건 등록, ${skipped}건 이미 있음`
      );
    } catch (e) {
      Alert.alert(
        "등록 실패",
        `예방접종 일정을 등록하지 못했어요. (${e instanceof Error ? e.message : "알 수 없는 오류"})`
      );
    } finally {
      setSyncing(false);
    }
  };

  // 현재 월의 일정 불러오기 (로그인 전에는 빈 목록)
  const loadEvents = useCallback(async () => {
    setLoading(true);
    try {
      if (!member) {
        setEvents([]);
        return;
      }
      const { from, to } = monthRange(year, month);
      const list = await db.listEvents(member.familyId, from, to);
      setEvents(list);
    } catch (e) {
      Alert.alert(
        "불러오기 실패",
        `일정을 불러오지 못했어요. (${e instanceof Error ? e.message : "알 수 없는 오류"})`
      );
    } finally {
      setLoading(false);
    }
  }, [db, member, year, month]);

  useEffect(() => {
    void loadEvents();
  }, [loadEvents]);

  // 월 변경
  const changeMonth = (delta: -1 | 1) => {
    let nextYear = year;
    let nextMonth = month + delta;
    if (nextMonth < 1) {
      nextMonth = 12;
      nextYear -= 1;
    } else if (nextMonth > 12) {
      nextMonth = 1;
      nextYear += 1;
    }
    setYear(nextYear);
    setMonth(nextMonth);
    // 선택 날짜가 화면에 보이는 달에 없으면 1일로 조정
    const [y, m] = selectedDate.split("-").map(Number);
    if (y !== nextYear || m !== nextMonth) {
      setSelectedDate(toDateString(nextYear, nextMonth, 1));
    }
  };

  // 날짜 탭: 다른 달 날짜면 해당 달로 이동
  const selectDate = (date: string) => {
    const [y, m] = date.split("-").map(Number);
    if (y !== year || m !== month) {
      setYear(y);
      setMonth(m);
    }
    setSelectedDate(date);
  };

  // 날짜별 일정 맵 (MonthGrid 점 표시용)
  const eventsByDate = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    for (const event of events) {
      if (!map[event.date]) map[event.date] = [];
      map[event.date].push(event);
    }
    return map;
  }, [events]);

  // 선택된 날짜의 일정 (시작 시간순 정렬)
  const selectedEvents = useMemo(() => {
    const list = eventsByDate[selectedDate] ?? [];
    return [...list].sort((a, b) => {
      if (a.startTime && b.startTime)
        return a.startTime.localeCompare(b.startTime);
      if (a.startTime) return -1;
      if (b.startTime) return 1;
      return a.title.localeCompare(b.title);
    });
  }, [eventsByDate, selectedDate]);

  // 일정 저장
  const handleSubmit = async (value: EventFormValue) => {
    if (!member) {
      Alert.alert("로그인 필요", "일정을 저장하려면 먼저 가족에 참여해 주세요.");
      return;
    }
    try {
      await db.createEvent({ ...value, familyId: member.familyId });
      setFormVisible(false);
      // 저장한 일정이 현재 월에 있으면 목록 새로고침
      const [y, m] = value.date.split("-").map(Number);
      if (y === year && m === month) {
        await loadEvents();
      } else {
        setYear(y);
        setMonth(m);
        setSelectedDate(value.date);
      }
    } catch (e) {
      Alert.alert(
        "저장 실패",
        `일정을 저장하지 못했어요. (${e instanceof Error ? e.message : "알 수 없는 오류"})`
      );
    }
  };

  // 일정 삭제
  const handleDelete = async (id: string) => {
    try {
      await db.deleteEvent(id);
      await loadEvents();
    } catch (e) {
      Alert.alert(
        "삭제 실패",
        `일정을 삭제하지 못했어요. (${e instanceof Error ? e.message : "알 수 없는 오류"})`
      );
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <MonthGrid
          year={year}
          month={month}
          selectedDate={selectedDate}
          today={today}
          eventsByDate={eventsByDate}
          onSelectDate={selectDate}
          onChangeMonth={changeMonth}
        />

        <View style={styles.divider} />

        <EventList
          date={selectedDate}
          events={selectedEvents}
          onDeleteEvent={handleDelete}
        />

        <View style={styles.divider} />

        {/* 다가오는 예방접종 */}
        <View style={styles.vaxSection}>
          <Text style={styles.sectionTitle}>다가오는 예방접종</Text>
          {child ? (
            <>
              {upcoming.length === 0 ? (
                <Text style={styles.emptyText}>
                  30일 이내 예정된 접종이 없어요.
                </Text>
              ) : (
                upcoming.map((dose) => (
                  <View
                    key={`${dose.vaccine}-${dose.dose}`}
                    style={styles.vaxRow}
                  >
                    <View>
                      <Text style={styles.vaxTitle}>
                        {dose.vaccine} {dose.dose}
                      </Text>
                      <Text style={styles.vaxDate}>{dose.dueDate}</Text>
                    </View>
                    <View style={styles.vaxRight}>
                      <Text style={styles.vaxDday}>
                        {formatDday(dose.dday)}
                      </Text>
                      <Text style={styles.vaxStatus}>
                        {doseStatusLabel(dose.status)}
                      </Text>
                    </View>
                  </View>
                ))
              )}
              <Pressable
                style={[
                  styles.syncButton,
                  syncing && styles.syncButtonDisabled,
                ]}
                onPress={() => void handleSyncVaccinations()}
                disabled={syncing}
                accessibilityLabel="예방접종 일정 자동 등록"
              >
                <Text style={styles.syncButtonText}>
                  {syncing ? "등록 중…" : "예방접종 일정 자동 등록"}
                </Text>
              </Pressable>
            </>
          ) : (
            <Text style={styles.emptyText}>
              설정에서 아이를 먼저 등록해주세요.
            </Text>
          )}
        </View>

        {loading ? <Text style={styles.loadingText}>불러오는 중…</Text> : null}
      </ScrollView>

      {/* 일정 추가 버튼 */}
      <Pressable
        style={styles.fab}
        onPress={() => setFormVisible(true)}
        accessibilityLabel="일정 추가"
      >
        <Text style={styles.fabText}>+</Text>
      </Pressable>

      {/* 일정 입력 모달 */}
      <Modal
        visible={formVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setFormVisible(false)}
      >
        <SafeAreaView style={styles.modalSafe}>
          <EventForm
            initialDate={selectedDate}
            onSubmit={(value) => void handleSubmit(value)}
            onCancel={() => setFormVisible(false)}
          />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingBottom: 100, // FAB에 가려지지 않도록 여백
  },
  divider: {
    height: 8,
    backgroundColor: "#f3f4f6",
    marginVertical: 12,
  },
  loadingText: {
    textAlign: "center",
    color: "#9ca3af",
    fontSize: 13,
    paddingVertical: 8,
  },
  vaxSection: {
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 14,
    color: "#9ca3af",
    marginBottom: 12,
  },
  vaxRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 8,
  },
  vaxTitle: {
    fontSize: 15,
    fontWeight: "600",
  },
  vaxDate: {
    fontSize: 13,
    color: "#868e96",
    marginTop: 2,
  },
  vaxRight: {
    alignItems: "flex-end",
  },
  vaxDday: {
    fontSize: 15,
    fontWeight: "700",
    color: "#2563eb",
  },
  vaxStatus: {
    fontSize: 12,
    color: "#868e96",
    marginTop: 2,
  },
  syncButton: {
    backgroundColor: "#2563eb",
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: "center",
    marginTop: 8,
  },
  syncButtonDisabled: {
    opacity: 0.6,
  },
  syncButtonText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "600",
  },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 28,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#2563eb",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 5,
  },
  fabText: {
    fontSize: 32,
    color: "#ffffff",
    lineHeight: 34,
  },
  modalSafe: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
});
