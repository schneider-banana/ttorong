// 선택된 날짜의 일정 목록
// - 일정 종류별 색상 뱃지
// - 시작~종료 시간 표시, 담당자·메모 표시
// - 길게 누르면 삭제 확인 후 삭제
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import type { CalendarEvent } from "../../types";
import { EVENT_KIND_META } from "./eventKind";

interface EventListProps {
  /** 선택된 날짜 (YYYY-MM-DD) */
  date: string;
  /** 해당 날짜 일정 (시작 시간순 정렬된 상태로 전달) */
  events: CalendarEvent[];
  /** 일정 삭제 요청 */
  onDeleteEvent: (id: string) => void;
  /** 날짜 타이틀 표시 여부 (기본 true — 홈처럼 날짜를 이미 보여주는 화면에서는 false) */
  showDateTitle?: boolean;
}

/** 날짜를 "10월 17일 (토)" 형식으로 표시 */
function formatDateLabel(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  const weekday = ["일", "월", "화", "수", "목", "금", "토"][
    new Date(y, m - 1, d).getDay()
  ];
  return `${m}월 ${d}일 (${weekday})`;
}

/** "09:30" → "오전 9:30" 형식 (없으면 빈 문자열) */
function formatTime(time?: string): string {
  if (!time) return "";
  const [h, min] = time.split(":").map(Number);
  const period = h < 12 ? "오전" : "오후";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${period} ${hour12}:${String(min).padStart(2, "0")}`;
}

export function EventList({
  date,
  events,
  onDeleteEvent,
  showDateTitle = true,
}: EventListProps) {
  const confirmDelete = (event: CalendarEvent) => {
    Alert.alert("일정 삭제", `「${event.title}」 일정을 삭제할까요?`, [
      { text: "취소", style: "cancel" },
      {
        text: "삭제",
        style: "destructive",
        onPress: () => onDeleteEvent(event.id),
      },
    ]);
  };

  return (
    <View style={styles.container}>
      {showDateTitle ? (
        <Text style={styles.dateTitle}>{formatDateLabel(date)}</Text>
      ) : null}

      {events.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyText}>등록된 일정이 없어요</Text>
          <Text style={styles.emptyHint}>
            아래 + 버튼을 눌러 일정을 추가해 보세요
          </Text>
        </View>
      ) : (
        events.map((event) => {
          const meta = EVENT_KIND_META[event.kind];
          const start = formatTime(event.startTime);
          const end = formatTime(event.endTime);
          const timeLabel =
            start || end ? `${start}${end ? ` ~ ${end}` : ""}` : "시간 미정";

          return (
            <Pressable
              key={event.id}
              style={[styles.card, { borderLeftColor: meta.color }]}
              onLongPress={() => confirmDelete(event)}
              delayLongPress={500}
            >
              <View style={styles.cardHeader}>
                <View
                  style={[styles.badge, { backgroundColor: meta.color }]}
                >
                  <Text style={styles.badgeText}>{meta.label}</Text>
                </View>
                <Text style={styles.timeText}>{timeLabel}</Text>
              </View>
              <Text style={styles.titleText}>{event.title}</Text>
              {event.assigneeId ? (
                <Text style={styles.subText}>담당: {event.assigneeId}</Text>
              ) : null}
              {event.memo ? (
                <Text style={styles.memoText}>{event.memo}</Text>
              ) : null}
            </Pressable>
          );
        })
      )}

      <Text style={styles.deleteHint}>
        일정을 길게 누르면 삭제할 수 있어요
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  dateTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 12,
  },
  emptyBox: {
    alignItems: "center",
    paddingVertical: 32,
    backgroundColor: "#f9fafb",
    borderRadius: 12,
  },
  emptyText: {
    fontSize: 15,
    color: "#6b7280",
  },
  emptyHint: {
    fontSize: 13,
    color: "#9ca3af",
    marginTop: 6,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    borderLeftWidth: 4,
    padding: 14,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  badge: {
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  badgeText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "700",
  },
  timeText: {
    fontSize: 13,
    color: "#6b7280",
  },
  titleText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },
  subText: {
    fontSize: 13,
    color: "#6b7280",
    marginTop: 4,
  },
  memoText: {
    fontSize: 13,
    color: "#4b5563",
    marginTop: 4,
  },
  deleteHint: {
    fontSize: 12,
    color: "#9ca3af",
    textAlign: "center",
    marginTop: 8,
  },
});
