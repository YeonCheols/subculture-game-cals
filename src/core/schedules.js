const typeMap = { event: ["이벤트", "event"], update: ["업데이트", "update"], maintenance: ["점검", "update"], banner: ["픽업", "pickup"], broadcast: ["공식방송", "broadcast"], notice: ["공지", "update"] };
const statusMap = { active: ["진행중", "live"], upcoming: ["예정", "upcoming"], ended: ["종료", "ended"], unknown: ["시간 미정", "upcoming"] };

export const KST_TIME_ZONE = "Asia/Seoul";
export const DEFAULT_REMINDER_OFFSET_MINUTES = 60;

export function kstDateKey(value = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: KST_TIME_ZONE }).format(value);
}

export function overlapsDate(event, date) {
  const start = Date.parse(event.startsAt);
  const end = event.endsAt ? Date.parse(event.endsAt) : start;
  const dayStart = Date.parse(`${date}T00:00:00+09:00`);
  const dayEnd = Date.parse(`${date}T23:59:59.999+09:00`);
  return !Number.isNaN(start) && start <= dayEnd && end >= dayStart;
}

export function reminderAt(event, offsetMinutes = DEFAULT_REMINDER_OFFSET_MINUTES) {
  const startsAt = Date.parse(event.startsAt);
  return Number.isNaN(startsAt) ? null : new Date(startsAt - offsetMinutes * 60 * 1000);
}

export function toScheduleGroups(events, games) {
  const formatter = new Intl.DateTimeFormat("ko-KR", { timeZone: KST_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit", weekday: "short" });
  const timeFormatter = new Intl.DateTimeFormat("ko-KR", { timeZone: KST_TIME_ZONE, hour: "2-digit", minute: "2-digit", hour12: false });
  const today = kstDateKey();
  const groups = new Map();
  for (const event of events) {
    const instant = event.startsAt;
    if (!instant || !games.some((game) => game.id === event.gameId)) continue;
    const date = kstDateKey(new Date(instant));
    const [type, typeKey] = typeMap[event.type] || typeMap.notice;
    const [status, statusKey] = statusMap[event.status] || statusMap.unknown;
    if (!groups.has(date)) groups.set(date, { date, label: date === today ? "오늘" : formatter.format(new Date(instant)).split(" ").at(-1), dateLabel: formatter.format(new Date(instant)), ...(date === today ? { tag: "오늘" } : {}), items: [] });
    groups.get(date).items.push({ ...event, time: timeFormatter.format(new Date(instant)), type, typeKey, status, statusKey, source: "공식 공지", reminder: `${DEFAULT_REMINDER_OFFSET_MINUTES}분 전` });
  }
  return [...groups.values()].sort((a, b) => a.date.localeCompare(b.date));
}
