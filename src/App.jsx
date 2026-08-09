import { useCallback, useEffect, useMemo, useState } from "react";
import { IconAdjustmentsHorizontal, IconBell, IconBellFilled, IconCalendar, IconChevronDown, IconClock, IconExternalLink, IconFileText, IconLayoutList, IconRefresh, IconSearch, IconSettings, IconX } from "@tabler/icons-react";
import { games } from "./data/schedules";
import "./event-detail.css";
import "./game-icons.css";
import "./date-filter.css";

const typeLabels = ["전체", "업데이트", "공식방송", "이벤트", "픽업"];
const statusLabels = ["전체 상태", "진행중", "예정", "종료"];
const typeMap = { event: ["이벤트", "event"], update: ["업데이트", "update"], maintenance: ["점검", "update"], banner: ["픽업", "pickup"], broadcast: ["공식방송", "broadcast"], notice: ["공지", "update"] };
const statusMap = { active: ["진행중", "live"], upcoming: ["예정", "upcoming"], ended: ["종료", "ended"], unknown: ["시간 미정", "upcoming"] };

function apiUrl(name) {
  return window.location.protocol === "file:" ? new URL(`./api/${name}.json`, window.location.href).toString() : `/api/${name}.json`;
}

async function browserScheduleData(date = "") {
  const query = date ? `?date=${encodeURIComponent(date)}` : "";
  try {
    const [eventsResponse, statusResponse] = await Promise.all([fetch(`/remote-api/events${query}`, { cache: "no-store" }), fetch("/remote-api/collection-status", { cache: "no-store" })]);
    if (!eventsResponse.ok) throw new Error(`events ${eventsResponse.status}`);
    return { events: await eventsResponse.json(), status: statusResponse.ok ? await statusResponse.json() : null, source: "remote" };
  } catch (remoteError) {
    const [eventsResponse, statusResponse] = await Promise.all([fetch(apiUrl("events"), { cache: "no-store" }), fetch(apiUrl("collection-status"), { cache: "no-store" })]);
    if (!eventsResponse.ok) throw remoteError;
    const events = await eventsResponse.json();
    const filteredEvents = date ? events.filter((event) => { const start = Date.parse(event.startsAt); const end = event.endsAt ? Date.parse(event.endsAt) : start; const dayStart = Date.parse(`${date}T00:00:00+09:00`); const dayEnd = Date.parse(`${date}T23:59:59.999+09:00`); return !Number.isNaN(start) && start <= dayEnd && end >= dayStart; }) : events;
    return { events: filteredEvents, status: statusResponse.ok ? await statusResponse.json() : null, source: "bundled", warning: remoteError.message };
  }
}

function toScheduleGroups(events) {
  const formatter = new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit", weekday: "short" });
  const timeFormatter = new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", hour: "2-digit", minute: "2-digit", hour12: false });
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date());
  const groups = new Map();
  for (const event of events) {
    const instant = event.startsAt;
    if (!instant || !games.some((game) => game.id === event.gameId)) continue;
    const date = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date(instant));
    const [type, typeKey] = typeMap[event.type] || typeMap.notice;
    const [status, statusKey] = statusMap[event.status] || statusMap.unknown;
    if (!groups.has(date)) groups.set(date, { date, label: date === today ? "오늘" : formatter.format(new Date(instant)).split(" ").at(-1), dateLabel: formatter.format(new Date(instant)), ...(date === today ? { tag: "오늘" } : {}), items: [] });
    groups.get(date).items.push({ ...event, time: timeFormatter.format(new Date(instant)), type, typeKey, status, statusKey, source: "공식 공지", reminder: "1시간 전" });
  }
  return [...groups.values()].sort((a, b) => a.date.localeCompare(b.date));
}

function usePersistentState(key, initialValue) {
  const [value, setValue] = useState(() => {
    try { const saved = localStorage.getItem(key); return saved ? JSON.parse(saved) : initialValue; }
    catch { return initialValue; }
  });
  useEffect(() => { localStorage.setItem(key, JSON.stringify(value)); }, [key, value]);
  return [value, setValue];
}

function GameMark({ game, size = "md" }) {
  return <span className={`game-mark game-mark--${size}`} style={{ "--game": game.color, "--game-soft": game.soft }} aria-hidden="true"><img src={game.icon} alt="" /></span>;
}

function Sidebar({ subscribed, onToggleGame, page, setPage, notificationCount, lastSyncedAt }) {
  return <aside className="sidebar">
    <div className="brand"><span className="brand__mark"><IconClock size={22} /></span><div><strong>게임타임</strong><small>SUBCULTURE CALENDAR</small></div></div>
    <section className="game-subscriptions">
      <div className="section-kicker"><span>구독 중인 게임</span><b>{subscribed.length}</b></div>
      <div className="game-list">{games.map((game) => { const active = subscribed.includes(game.id); return <button key={game.id} className={`game-row ${active ? "is-active" : ""}`} onClick={() => onToggleGame(game.id)}><GameMark game={game} /><span className="game-row__name">{game.shortName}</span>{active ? <IconBellFilled size={17} style={{ color: game.color }} /> : <IconBell size={17} />}</button>; })}</div>
    </section>
    <nav className="side-nav" aria-label="주 메뉴">
      <button className={page === "schedule" ? "is-active" : ""} onClick={() => setPage("schedule")}><IconCalendar size={21} /><span>일정</span></button>
      <button className={page === "calendar" ? "is-active" : ""} onClick={() => setPage("calendar")}><IconCalendar size={21} /><span>캘린더</span></button>
      <button onClick={() => setPage("notifications")} className={page === "notifications" ? "is-active" : ""}><IconBell size={21} /><span>알림</span><b>{notificationCount}</b></button>
      <button onClick={() => setPage("sources")} className={page === "sources" ? "is-active" : ""}><IconFileText size={21} /><span>출처</span></button>
      <button onClick={() => setPage("settings")} className={page === "settings" ? "is-active" : ""}><IconSettings size={21} /><span>설정</span></button>
    </nav>
    <div className="sidebar__bottom"><button className="manage-button" onClick={() => setPage("settings")}><IconBell size={19} /><span>구독 관리</span><span>›</span></button><div className="sync-status"><span>{lastSyncedAt ? `마지막 동기화: ${new Date(lastSyncedAt).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}` : "저장된 일정 표시 중"}</span><IconRefresh size={14} /></div></div>
  </aside>;
}

function FilterSelect({ value, options, onChange }) {
  return <label className="select-control"><select value={value} onChange={(event) => onChange(event.target.value)}>{options.map((option) => <option key={option}>{option}</option>)}</select><IconChevronDown size={16} /></label>;
}

function ScheduleRow({ item, notifications, toggleNotification, onOpen }) {
  const game = games.find((entry) => entry.id === item.gameId);
  const notified = notifications.includes(item.id);
  const openSource = () => window.electronAPI?.openExternal(item.sourceUrl) ?? window.open(item.sourceUrl, "_blank", "noopener,noreferrer");
  return <article className="schedule-row schedule-row--interactive" role="button" tabIndex={0} onClick={() => onOpen(item)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") onOpen(item); }}>
    <time>{item.time}</time><GameMark game={game} size="sm" /><span className={`type-badge type-badge--${item.typeKey}`}>{item.type}</span>
    <div className="schedule-row__copy"><strong>{item.title}</strong><small>{game.name}</small></div><span className={`status status--${item.statusKey}`}>{item.status}</span>
    <button className="source-link" onClick={(event) => { event.stopPropagation(); openSource(); }}>{item.source}<IconExternalLink size={14} /></button>
    <button className={`notify-toggle ${notified ? "is-active" : ""}`} onClick={(event) => { event.stopPropagation(); toggleNotification(item.id); }} aria-label={`${item.title} 알림 ${notified ? "끄기" : "켜기"}`}>{notified ? <IconBellFilled size={17} /> : <IconBell size={17} />}</button>
  </article>;
}

function Timeline({ groups, notifications, toggleNotification, onOpen }) {
  if (!groups.length) return <div className="empty-state"><IconSearch size={30} /><strong>조건에 맞는 일정이 없습니다</strong><span>검색어나 필터를 바꿔보세요.</span></div>;
  return <div className="timeline">{groups.map((group) => <section className="day-group" key={group.date}><header><span className="timeline-dot" /><h2>{group.label}</h2><time>{group.dateLabel}</time>{group.tag && <b>{group.tag}</b>}</header><div className="day-group__items">{group.items.map((item) => <ScheduleRow key={item.id} item={item} notifications={notifications} toggleNotification={toggleNotification} onOpen={onOpen} />)}</div></section>)}</div>;
}

function MiniCalendar({ groups, onOpen, focusDate }) {
  const now = new Date();
  const [cursor, setCursor] = useState(() => new Date(now.getFullYear(), now.getMonth(), 1));
  useEffect(() => { if (focusDate) { const [year, month] = focusDate.split("-").map(Number); setCursor(new Date(year, month - 1, 1)); } }, [focusDate]);
  const weekdays = ["일", "월", "화", "수", "목", "금", "토"];
  const year = cursor.getFullYear(); const month = cursor.getMonth();
  const firstDay = new Date(year, month, 1).getDay(); const dayCount = new Date(year, month + 1, 0).getDate();
  const cells = Array.from({ length: 42 }, (_, index) => { const day = index - firstDay + 1; return day > 0 && day <= dayCount ? day : null; });
  const byDate = new Map(groups.map((group) => [group.date, group.items]));
  const todayKey = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(now);
  const keyFor = (day) => `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  return <section className="calendar-view"><header><button onClick={() => setCursor(new Date(year, month - 1, 1))} aria-label="이전 달">‹</button><h2>{year}년 {month + 1}월</h2><button onClick={() => setCursor(new Date(year, month + 1, 1))} aria-label="다음 달">›</button></header><div className="calendar-grid calendar-grid--weekdays">{weekdays.map((day) => <b key={day}>{day}</b>)}</div><div className="calendar-grid calendar-grid--events">{cells.map((day, index) => { const dateKey = day ? keyFor(day) : null; const items = dateKey ? byDate.get(dateKey) || [] : []; return <div key={index} className={`calendar-day ${dateKey === todayKey ? "is-today" : ""} ${items.length ? "has-event" : ""}`}><span>{day || ""}</span><div>{items.slice(0, 3).map((item) => { const game = games.find((entry) => entry.id === item.gameId); return <button key={item.id} onClick={() => onOpen(item)} style={{ "--game": game.color }} title={item.title}><i />{item.time} {item.title}</button>; })}{items.length > 3 && <small>+{items.length - 3}개</small>}</div></div>; })}</div></section>;
}

function EventDetailModal({ item, onClose, notifications, toggleNotification }) {
  useEffect(() => {
    if (!item) return undefined;
    const closeOnEscape = (event) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", closeOnEscape); document.body.classList.add("modal-open");
    return () => { window.removeEventListener("keydown", closeOnEscape); document.body.classList.remove("modal-open"); };
  }, [item, onClose]);
  if (!item) return null;
  const game = games.find((entry) => entry.id === item.gameId);
  const notified = notifications.includes(item.id);
  const dateTime = (value) => value ? new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", year: "numeric", month: "long", day: "numeric", weekday: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(value)) : "미정";
  const openSource = () => window.electronAPI?.openExternal(item.sourceUrl) ?? window.open(item.sourceUrl, "_blank", "noopener,noreferrer");
  return <div className="event-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="event-modal" role="dialog" aria-modal="true" aria-labelledby="event-modal-title">
      <header><div className="event-modal__game"><GameMark game={game} /><div><span>{game.name}</span><small>공식 일정 상세</small></div></div><button className="event-modal__close" onClick={onClose} aria-label="닫기"><IconX size={20} /></button></header>
      <div className="event-modal__body">
        <div className="event-modal__badges"><span className={`type-badge type-badge--${item.typeKey}`}>{item.type}</span><span className={`status status--${item.statusKey}`}>{item.status}</span>{item.version && <span className="event-modal__version">v{item.version}</span>}</div>
        <h2 id="event-modal-title">{item.title}</h2>
        <p className="event-modal__summary">{item.summary || "공식 공지에서 확인된 일정입니다. 아래 원문에서 전체 안내와 참여 조건을 확인할 수 있습니다."}</p>
        <dl className="event-modal__facts"><div><dt>시작</dt><dd>{dateTime(item.startsAt)}</dd></div><div><dt>종료</dt><dd>{dateTime(item.endsAt)}</dd></div><div><dt>확인된 시간</dt><dd>{item.sourceTimeText || "공식 공지 참조"}</dd></div><div><dt>데이터 상태</dt><dd>{item.confidence === "confirmed" ? "공식 출처 확인 완료" : "확인 중"}</dd></div></dl>
        <aside className="event-modal__source"><IconFileText size={18} /><div><strong>공식 출처</strong><span>{item.sourceTitle || game.name}</span><small>{item.sourceUrl}</small></div></aside>
      </div>
      <footer><button className={`event-modal__notify ${notified ? "is-active" : ""}`} onClick={() => toggleNotification(item.id)}>{notified ? <IconBellFilled size={18} /> : <IconBell size={18} />}{notified ? "알림 설정됨" : "일정 알림 받기"}</button><button className="event-modal__source-button" onClick={openSource}>공식 원문 보기<IconExternalLink size={17} /></button></footer>
    </section>
  </div>;
}

function NotificationPanel({ allItems, notifications, toggleNotification }) {
  const notifiedItems = allItems.filter((item) => notifications.includes(item.id));
  return <aside className="notification-panel"><header><div><h2>오늘의 알림 큐 <b>{notifiedItems.length}</b></h2><span>예정된 알림</span></div><button aria-label="알림 설정"><IconSettings size={19} /></button></header><div className="notification-list">{notifiedItems.slice(0, 5).map((item) => { const game = games.find((entry) => entry.id === item.gameId); return <article key={item.id}><time>{item.time}</time><GameMark game={game} size="sm" /><div><strong>{game.shortName}</strong><span>{item.title}</span><small>{item.reminder}</small></div><button onClick={() => toggleNotification(item.id)} aria-label="알림 제거"><IconX size={16} /></button></article>; })}{!notifiedItems.length && <div className="panel-empty"><IconBell size={26} /><span>등록된 알림이 없습니다.</span></div>}</div><div className="notification-panel__done"><span>완료된 알림</span><div><IconClock size={16} /><p><strong>09:00 · 원신</strong><small>일일 의뢰 초기화</small></p></div></div><button className="read-all" onClick={() => window.electronAPI?.testNotification?.("게임타임", "알림 설정이 정상적으로 연결되었습니다.")}>알림 테스트</button></aside>;
}

export function App() {
  const [page, setPage] = useState("schedule");
  const [selectedItem, setSelectedItem] = useState(null);
  const [query, setQuery] = useState(""); const [gameFilter, setGameFilter] = useState("모든 게임"); const [dateFilter, setDateFilter] = useState(""); const [typeFilter, setTypeFilter] = useState("전체"); const [statusFilter, setStatusFilter] = useState("전체 상태"); const [showAll, setShowAll] = useState(false);
  const [subscribed, setSubscribed] = usePersistentState("gametime:subscriptions", games.map((game) => game.id));
  const [notifications, setNotifications] = usePersistentState("gametime:notifications", ["ms-1", "ww-1", "gi-1"]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [remoteGroups, setRemoteGroups] = useState([]);
  const [lastSyncedAt, setLastSyncedAt] = useState(null);
  const activeGroups = remoteGroups;
  const allItems = useMemo(() => activeGroups.flatMap((group) => group.items), [activeGroups]);
  const visibleGroups = useMemo(() => { const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date()); return activeGroups.map((group) => ({ ...group, items: group.items.filter((item) => { const game = games.find((entry) => entry.id === item.gameId); return subscribed.includes(item.gameId) && (gameFilter === "모든 게임" || game.shortName === gameFilter) && (typeFilter === "전체" || item.type === typeFilter) && (statusFilter === "전체 상태" || item.status === statusFilter) && (showAll || dateFilter || group.date >= today) && (`${item.title} ${game.name}`.toLowerCase().includes(query.toLowerCase())); }) })).filter((group) => group.items.length); }, [activeGroups, query, gameFilter, dateFilter, typeFilter, statusFilter, showAll, subscribed]);
  const toggleGame = (id) => setSubscribed((current) => current.includes(id) ? current.filter((gameId) => gameId !== id) : [...current, id]);
  const toggleNotification = (id) => setNotifications((current) => current.includes(id) ? current.filter((itemId) => itemId !== id) : [...current, id]);
  const refresh = useCallback(async () => { setIsRefreshing(true); try { const payload = window.electronAPI?.fetchScheduleData ? await window.electronAPI.fetchScheduleData(dateFilter) : await browserScheduleData(dateFilter); if (!Array.isArray(payload.events)) throw new Error("events response is not an array"); setRemoteGroups(toScheduleGroups(payload.events)); if (payload.status?.retrievedAt) setLastSyncedAt(payload.status.retrievedAt); } catch (error) { console.error("공식 일정 API를 불러오지 못했습니다.", error); } finally { setIsRefreshing(false); } }, [dateFilter]);
  useEffect(() => { refresh(); const timer = window.setInterval(refresh, 5 * 60 * 1000); const removeIpcListener = window.electronAPI?.onRefreshSchedules?.(refresh); const refreshWhenVisible = () => { if (document.visibilityState === "visible") refresh(); }; document.addEventListener("visibilitychange", refreshWhenVisible); return () => { window.clearInterval(timer); removeIpcListener?.(); document.removeEventListener("visibilitychange", refreshWhenVisible); }; }, [refresh]);
  return <div className="app-shell"><Sidebar subscribed={subscribed} onToggleGame={toggleGame} page={page} setPage={setPage} notificationCount={notifications.length} lastSyncedAt={lastSyncedAt} /><main className="workspace"><header className="toolbar"><label className="search-box"><IconSearch size={19} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="일정, 게임, 키워드 검색" /><kbd>/</kbd></label><div className="view-switch"><button className={page === "schedule" ? "is-active" : ""} onClick={() => setPage("schedule")}><IconLayoutList size={18} />목록</button><button className={page === "calendar" ? "is-active" : ""} onClick={() => setPage("calendar")}><IconCalendar size={18} />캘린더</button></div><button className={`refresh-button ${isRefreshing ? "is-loading" : ""}`} onClick={refresh} title="일정 새로고침"><IconRefresh size={19} /></button></header><section className="filters"><FilterSelect value={gameFilter} options={["모든 게임", ...games.map((game) => game.shortName)]} onChange={setGameFilter} /><label className={`date-filter ${dateFilter ? "has-value" : ""}`}><IconCalendar size={16} /><input type="date" value={dateFilter} onChange={(event) => setDateFilter(event.target.value)} aria-label="일정 날짜 검색" />{dateFilter && <button type="button" onClick={() => setDateFilter("")} aria-label="날짜 필터 초기화"><IconX size={14} /></button>}</label><FilterSelect value={typeFilter} options={typeLabels} onChange={setTypeFilter} /><FilterSelect value={statusFilter} options={statusLabels} onChange={setStatusFilter} /><label className="checkbox"><input type="checkbox" checked={showAll} onChange={(event) => setShowAll(event.target.checked)} /><span />전체보기</label><IconAdjustmentsHorizontal className="filter-icon" size={19} /></section><section className="content-area">{page === "calendar" ? <MiniCalendar groups={visibleGroups} onOpen={setSelectedItem} focusDate={dateFilter} /> : <Timeline groups={visibleGroups} notifications={notifications} toggleNotification={toggleNotification} onOpen={setSelectedItem} />}</section></main><NotificationPanel allItems={allItems} notifications={notifications} toggleNotification={toggleNotification} /><EventDetailModal item={selectedItem} onClose={() => setSelectedItem(null)} notifications={notifications} toggleNotification={toggleNotification} /></div>;
}
