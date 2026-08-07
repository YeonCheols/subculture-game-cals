import { useEffect, useMemo, useState } from "react";
import { IconAdjustmentsHorizontal, IconBell, IconBellFilled, IconCalendar, IconChevronDown, IconClock, IconExternalLink, IconFileText, IconLayoutList, IconRefresh, IconSearch, IconSettings, IconSparkles, IconX } from "@tabler/icons-react";
import { games, scheduleGroups } from "./data/schedules";

const typeLabels = ["전체", "업데이트", "공식방송", "이벤트", "픽업"];
const statusLabels = ["전체 상태", "진행중", "예정"];

function usePersistentState(key, initialValue) {
  const [value, setValue] = useState(() => {
    try { const saved = localStorage.getItem(key); return saved ? JSON.parse(saved) : initialValue; }
    catch { return initialValue; }
  });
  useEffect(() => { localStorage.setItem(key, JSON.stringify(value)); }, [key, value]);
  return [value, setValue];
}

function GameMark({ game, size = "md" }) {
  return <span className={`game-mark game-mark--${size}`} style={{ "--game": game.color, "--game-soft": game.soft }} aria-hidden="true"><IconSparkles size={size === "sm" ? 14 : 18} stroke={1.8} /></span>;
}

function Sidebar({ subscribed, onToggleGame, page, setPage, notificationCount }) {
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
    <div className="sidebar__bottom"><button className="manage-button" onClick={() => setPage("settings")}><IconBell size={19} /><span>구독 관리</span><span>›</span></button><div className="sync-status"><span>마지막 동기화: 방금 전 (KST)</span><IconRefresh size={14} /></div></div>
  </aside>;
}

function FilterSelect({ value, options, onChange }) {
  return <label className="select-control"><select value={value} onChange={(event) => onChange(event.target.value)}>{options.map((option) => <option key={option}>{option}</option>)}</select><IconChevronDown size={16} /></label>;
}

function ScheduleRow({ item, notifications, toggleNotification }) {
  const game = games.find((entry) => entry.id === item.gameId);
  const notified = notifications.includes(item.id);
  const openSource = () => window.electronAPI?.openExternal(item.sourceUrl) ?? window.open(item.sourceUrl, "_blank", "noopener,noreferrer");
  return <article className="schedule-row">
    <time>{item.time}</time><GameMark game={game} size="sm" /><span className={`type-badge type-badge--${item.typeKey}`}>{item.type}</span>
    <div className="schedule-row__copy"><strong>{item.title}</strong><small>{game.name}</small></div><span className={`status status--${item.statusKey}`}>{item.status}</span>
    <button className="source-link" onClick={openSource}>{item.source}<IconExternalLink size={14} /></button>
    <button className={`notify-toggle ${notified ? "is-active" : ""}`} onClick={() => toggleNotification(item.id)} aria-label={`${item.title} 알림 ${notified ? "끄기" : "켜기"}`}>{notified ? <IconBellFilled size={17} /> : <IconBell size={17} />}</button>
  </article>;
}

function Timeline({ groups, notifications, toggleNotification }) {
  if (!groups.length) return <div className="empty-state"><IconSearch size={30} /><strong>조건에 맞는 일정이 없습니다</strong><span>검색어나 필터를 바꿔보세요.</span></div>;
  return <div className="timeline">{groups.map((group) => <section className="day-group" key={group.date}><header><span className="timeline-dot" /><h2>{group.label}</h2><time>{group.dateLabel}</time>{group.tag && <b>{group.tag}</b>}</header><div className="day-group__items">{group.items.map((item) => <ScheduleRow key={item.id} item={item} notifications={notifications} toggleNotification={toggleNotification} />)}</div></section>)}</div>;
}

function MiniCalendar({ groups }) {
  const weekdays = ["일", "월", "화", "수", "목", "금", "토"];
  const days = Array.from({ length: 35 }, (_, index) => index - 4);
  const eventDates = new Set(groups.map((group) => Number(group.date.slice(-2))));
  return <section className="calendar-view"><header><button>‹</button><h2>2026년 8월</h2><button>›</button></header><div className="calendar-grid calendar-grid--weekdays">{weekdays.map((day) => <b key={day}>{day}</b>)}</div><div className="calendar-grid">{days.map((day, index) => { const valid = day > 0 && day <= 31; return <button key={index} disabled={!valid} className={`${day === 7 ? "is-today" : ""} ${eventDates.has(day) ? "has-event" : ""}`}><span>{valid ? day : ""}</span>{eventDates.has(day) && <i />}</button>; })}</div></section>;
}

function NotificationPanel({ allItems, notifications, toggleNotification }) {
  const notifiedItems = allItems.filter((item) => notifications.includes(item.id));
  return <aside className="notification-panel"><header><div><h2>오늘의 알림 큐 <b>{notifiedItems.length}</b></h2><span>예정된 알림</span></div><button aria-label="알림 설정"><IconSettings size={19} /></button></header><div className="notification-list">{notifiedItems.slice(0, 5).map((item) => { const game = games.find((entry) => entry.id === item.gameId); return <article key={item.id}><time>{item.time}</time><GameMark game={game} size="sm" /><div><strong>{game.shortName}</strong><span>{item.title}</span><small>{item.reminder}</small></div><button onClick={() => toggleNotification(item.id)} aria-label="알림 제거"><IconX size={16} /></button></article>; })}{!notifiedItems.length && <div className="panel-empty"><IconBell size={26} /><span>등록된 알림이 없습니다.</span></div>}</div><div className="notification-panel__done"><span>완료된 알림</span><div><IconClock size={16} /><p><strong>09:00 · 원신</strong><small>일일 의뢰 초기화</small></p></div></div><button className="read-all" onClick={() => window.electronAPI?.testNotification?.("게임타임", "알림 설정이 정상적으로 연결되었습니다.")}>알림 테스트</button></aside>;
}

export function App() {
  const [page, setPage] = useState("schedule");
  const [query, setQuery] = useState(""); const [gameFilter, setGameFilter] = useState("모든 게임"); const [typeFilter, setTypeFilter] = useState("전체"); const [statusFilter, setStatusFilter] = useState("전체 상태"); const [hideEnded, setHideEnded] = useState(true);
  const [subscribed, setSubscribed] = usePersistentState("gametime:subscriptions", games.map((game) => game.id));
  const [notifications, setNotifications] = usePersistentState("gametime:notifications", ["ms-1", "ww-1", "gi-1"]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const allItems = useMemo(() => scheduleGroups.flatMap((group) => group.items), []);
  const visibleGroups = useMemo(() => scheduleGroups.map((group) => ({ ...group, items: group.items.filter((item) => { const game = games.find((entry) => entry.id === item.gameId); return subscribed.includes(item.gameId) && (gameFilter === "모든 게임" || game.shortName === gameFilter) && (typeFilter === "전체" || item.type === typeFilter) && (statusFilter === "전체 상태" || item.status === statusFilter) && (!hideEnded || item.statusKey !== "ended") && (`${item.title} ${game.name}`.toLowerCase().includes(query.toLowerCase())); }) })).filter((group) => group.items.length), [query, gameFilter, typeFilter, statusFilter, hideEnded, subscribed]);
  const toggleGame = (id) => setSubscribed((current) => current.includes(id) ? current.filter((gameId) => gameId !== id) : [...current, id]);
  const toggleNotification = (id) => setNotifications((current) => current.includes(id) ? current.filter((itemId) => itemId !== id) : [...current, id]);
  const refresh = () => { setIsRefreshing(true); window.setTimeout(() => setIsRefreshing(false), 900); };
  useEffect(() => { const timer = window.setInterval(refresh, 15 * 60 * 1000); return () => window.clearInterval(timer); }, []);
  return <div className="app-shell"><Sidebar subscribed={subscribed} onToggleGame={toggleGame} page={page} setPage={setPage} notificationCount={notifications.length} /><main className="workspace"><header className="toolbar"><label className="search-box"><IconSearch size={19} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="일정, 게임, 키워드 검색" /><kbd>/</kbd></label><div className="view-switch"><button className={page === "schedule" ? "is-active" : ""} onClick={() => setPage("schedule")}><IconLayoutList size={18} />목록</button><button className={page === "calendar" ? "is-active" : ""} onClick={() => setPage("calendar")}><IconCalendar size={18} />캘린더</button></div><button className={`refresh-button ${isRefreshing ? "is-loading" : ""}`} onClick={refresh} title="일정 새로고침"><IconRefresh size={19} /></button></header><section className="filters"><FilterSelect value={gameFilter} options={["모든 게임", ...games.map((game) => game.shortName)]} onChange={setGameFilter} /><FilterSelect value={typeFilter} options={typeLabels} onChange={setTypeFilter} /><FilterSelect value={statusFilter} options={statusLabels} onChange={setStatusFilter} /><label className="checkbox"><input type="checkbox" checked={hideEnded} onChange={(event) => setHideEnded(event.target.checked)} /><span />종료된 일정 숨기기</label><IconAdjustmentsHorizontal className="filter-icon" size={19} /></section><section className="content-area">{page === "calendar" ? <MiniCalendar groups={visibleGroups} /> : <Timeline groups={visibleGroups} notifications={notifications} toggleNotification={toggleNotification} />}</section></main><NotificationPanel allItems={allItems} notifications={notifications} toggleNotification={toggleNotification} /></div>;
}
