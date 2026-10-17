// 월간 캘린더 그리드
// - 한국어 요일 헤더 (일월화수목금토), 일요일은 빨간색
// - 오늘 날짜 하이라이트, 선택된 날짜 강조
// - 날짜마다 종류별 색상 점(dot)으로 일정 존재 표시 (최대 4개)
// - 이전/다음 달 날짜는 회색으로 표시, 탭하면 해당 월로 이동
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "../../theme";
import type { CalendarEvent } from "../../types";
import { EVENT_KIND_META, toDateString } from "./eventKind";

/** 한국어 요일 (인덱스 0 = 일요일) */
const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"] as const;

interface MonthGridProps {
  /** 표시할 연도 */
  year: number;
  /** 표시할 월 (1~12) */
  month: number;
  /** 선택된 날짜 (YYYY-MM-DD) */
  selectedDate: string;
  /** 오늘 날짜 (YYYY-MM-DD) */
  today: string;
  /** 날짜별 일정 (키: YYYY-MM-DD) */
  eventsByDate: Record<string, CalendarEvent[]>;
  /** 날짜 탭 */
  onSelectDate: (date: string) => void;
  /** 월 변경 (delta: -1 이전달, +1 다음달) */
  onChangeMonth: (delta: -1 | 1) => void;
}

export function MonthGrid({
  year,
  month,
  selectedDate,
  today,
  eventsByDate,
  onSelectDate,
  onChangeMonth,
}: MonthGridProps) {
  // 월 그리드 셀 계산: 6주 × 7일 고정
  const firstWeekday = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const daysInPrevMonth = new Date(year, month - 1, 0).getDate();
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;

  const cells: { date: string; day: number; inMonth: boolean }[] = [];
  for (let i = 0; i < 42; i++) {
    const dayIndex = i - firstWeekday + 1;
    if (dayIndex < 1) {
      // 이전 달
      const day = daysInPrevMonth + dayIndex;
      cells.push({
        date: toDateString(prevYear, prevMonth, day),
        day,
        inMonth: false,
      });
    } else if (dayIndex > daysInMonth) {
      // 다음 달
      const day = dayIndex - daysInMonth;
      cells.push({
        date: toDateString(nextYear, nextMonth, day),
        day,
        inMonth: false,
      });
    } else {
      cells.push({
        date: toDateString(year, month, dayIndex),
        day: dayIndex,
        inMonth: true,
      });
    }
  }

  return (
    <View>
      {/* 월 이동 헤더 */}
      <View style={styles.header}>
        <Pressable
          onPress={() => onChangeMonth(-1)}
          style={styles.monthButton}
          accessibilityLabel="이전 달"
        >
          <Text style={styles.monthButtonText}>‹</Text>
        </Pressable>
        <Text style={styles.monthTitle}>
          {year}년 {month}월
        </Text>
        <Pressable
          onPress={() => onChangeMonth(1)}
          style={styles.monthButton}
          accessibilityLabel="다음 달"
        >
          <Text style={styles.monthButtonText}>›</Text>
        </Pressable>
      </View>

      {/* 요일 헤더 */}
      <View style={styles.weekRow}>
        {WEEKDAYS.map((day, index) => (
          <View key={day} style={styles.cell}>
            <Text
              style={[
                styles.weekday,
                index === 0 && styles.sunday, // 일요일 빨강
              ]}
            >
              {day}
            </Text>
          </View>
        ))}
      </View>

      {/* 날짜 그리드 */}
      {Array.from({ length: 6 }, (_, week) => (
        <View key={week} style={styles.weekRow}>
          {cells.slice(week * 7, week * 7 + 7).map((cell, index) => {
            const isToday = cell.date === today;
            const isSelected = cell.date === selectedDate;
            const events = eventsByDate[cell.date] ?? [];
            // 종류별 중복 제거한 색상 점 (최대 4개)
            const dotColors = [
              ...new Set(events.map((e) => EVENT_KIND_META[e.kind].color)),
            ].slice(0, 4);

            return (
              <Pressable
                key={`${cell.date}-${index}`}
                style={styles.cell}
                onPress={() => onSelectDate(cell.date)}
                accessibilityLabel={`${cell.date} 선택`}
              >
                <View
                  style={[
                    styles.dayCircle,
                    isSelected && styles.selectedCircle,
                    isToday && !isSelected && styles.todayCircle,
                  ]}
                >
                  <Text
                    style={[
                      styles.dayText,
                      !cell.inMonth && styles.outsideMonthText,
                      isSelected && styles.selectedText,
                      index === 0 && cell.inMonth && !isSelected && styles.sunday,
                    ]}
                  >
                    {cell.day}
                  </Text>
                </View>
                {/* 일정 존재 표시 점 */}
                <View style={styles.dotRow}>
                  {dotColors.map((color) => (
                    <View
                      key={color}
                      style={[styles.dot, { backgroundColor: color }]}
                    />
                  ))}
                </View>
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  monthTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
  },
  monthButton: {
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  monthButtonText: {
    fontSize: 28,
    color: colors.primary,
    fontWeight: "600",
  },
  weekRow: {
    flexDirection: "row",
  },
  cell: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 4,
    minHeight: 52,
  },
  weekday: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textSoft,
  },
  sunday: {
    color: "#dc2626",
  },
  dayCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  dayText: {
    fontSize: 15,
    color: colors.text,
  },
  outsideMonthText: {
    color: colors.inactive,
  },
  selectedCircle: {
    backgroundColor: colors.primary,
  },
  selectedText: {
    color: "#ffffff",
    fontWeight: "700",
  },
  todayCircle: {
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  dotRow: {
    flexDirection: "row",
    marginTop: 2,
    height: 6,
    gap: 3,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
});
