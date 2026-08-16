import { useCallback, useEffect, useMemo, useState } from "react";
import { IconAdjustmentsHorizontal, IconBell, IconBellFilled, IconCalendar, IconCheck, IconChevronDown, IconChevronLeft, IconChevronRight, IconClock, IconCopy, IconExternalLink, IconFileText, IconGift, IconLayoutList, IconPhoto, IconRefresh, IconSearch, IconSword, IconUser, IconX } from "@tabler/icons-react";
import { kstDateKey, toScheduleGroups, UNDATED_PICKUP_GROUP } from "./core/schedules";
import { games } from "./data/schedules";
import { openExternalUrl } from "./platform/links";
import { initializeNativeNotifications, showTestNotification, syncNativeReminders } from "./platform/notifications";
import { fetchScheduleData, onPlatformScheduleRefresh } from "./platform/schedules";
import { fetchRedemptionCodes } from "./platform/redemptionCodes";
import { usePersistentState } from "./platform/usePersistentState";
import "./event-detail.css";
import "./banner-detail.css";
import "./modal-layout.css";
import "./undated-pickups.css";
import "./game-icons.css";
import "./date-filter.css";
import "./redemption-codes.css";

const typeLabels = ["전체", "업데이트", "공식방송", "이벤트", "픽업"];
const statusLabels = ["전체 상태", "진행중", "예정", "종료"];

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
      <button onClick={() => setPage("redemption")} className={page === "redemption" ? "is-active" : ""}><IconGift size={21} /><span>리딤코드</span></button>
    </nav>
    <div className="sidebar__bottom"><div className="sync-status"><span>{lastSyncedAt ? `마지막 동기화: ${new Date(lastSyncedAt).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}` : "저장된 일정 표시 중"}</span><IconRefresh size={14} /></div></div>
  </aside>;
}

function FilterSelect({ value, options, onChange }) {
  return <label className="select-control"><select value={value} onChange={(event) => onChange(event.target.value)}>{options.map((option) => { const entry = typeof option === "string" ? { label: option, value: option } : option; return <option key={entry.value} value={entry.value}>{entry.label}</option>; })}</select><IconChevronDown size={16} /></label>;
}

function ScheduleRow({ item, notifications, toggleNotification, onOpen }) {
  const game = games.find((entry) => entry.id === item.gameId);
  const notified = notifications.includes(item.id);
  const openSource = () => openExternalUrl(item.sourceUrl);
  return <article className="schedule-row schedule-row--interactive" role="button" tabIndex={0} onClick={() => onOpen(item)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") onOpen(item); }}>
    <time>{item.time}</time><GameMark game={game} size="sm" /><span className={`type-badge type-badge--${item.typeKey}`}>{item.type}</span>
    <div className="schedule-row__copy"><strong>{item.title}</strong><small>{game.name}</small></div><span className={`status status--${item.statusKey}`}>{item.status}</span>
    <button className="source-link" onClick={(event) => { event.stopPropagation(); openSource(); }}>{item.source}<IconExternalLink size={14} /></button>
    <button className={`notify-toggle ${notified ? "is-active" : ""}`} onClick={(event) => { event.stopPropagation(); toggleNotification(item.id); }} aria-label={`${item.title} 알림 ${notified ? "끄기" : "켜기"}`}>{notified ? <IconBellFilled size={17} /> : <IconBell size={17} />}</button>
  </article>;
}

function Timeline({ groups, notifications, toggleNotification, onOpen }) {
  const [undatedOpen, setUndatedOpen] = useState(false);
  if (!groups.length) return <div className="empty-state"><IconSearch size={30} /><strong>조건에 맞는 일정이 없습니다</strong><span>검색어나 필터를 바꿔보세요.</span></div>;
  return <div className="timeline">{groups.map((group) => { const isUndated = group.date === UNDATED_PICKUP_GROUP; const expanded = !isUndated || undatedOpen; return <section className={`day-group ${isUndated ? "day-group--undated" : ""} ${expanded ? "is-expanded" : "is-collapsed"}`} key={group.date}><header>{isUndated ? <button className="undated-group-toggle" onClick={() => setUndatedOpen((current) => !current)} aria-expanded={expanded}><span className="timeline-dot" /><span className="undated-group-toggle__copy"><strong>{group.label}</strong><small>{group.dateLabel}</small></span><b>{group.items.length}개</b><span className="undated-group-toggle__tag">{expanded ? "접기" : "펼치기"}</span><IconChevronDown size={17} /></button> : <><span className="timeline-dot" /><h2>{group.label}</h2><time>{group.dateLabel}</time>{group.tag && <b>{group.tag}</b>}</>}</header>{expanded && <div className="day-group__items">{group.items.map((item) => <ScheduleRow key={item.id} item={item} notifications={notifications} toggleNotification={toggleNotification} onOpen={onOpen} />)}</div>}</section>; })}</div>;
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

function BannerTargets({ icon, title, targets }) {
  if (!targets?.length) return null;
  return <section className="event-banner__targets"><h4>{icon}{title}<b>{targets.length}</b></h4><div>{targets.map((target, index) => <span className={`event-banner__target event-banner__target--${target.rarity || "unknown"}`} key={`${target.name}-${index}`}><strong>{target.name}</strong><small>{target.rarity ? `${target.rarity}성` : "희귀도 미정"}</small></span>)}</div></section>;
}

function isDisplayableBannerImage(url) {
  try { return !decodeURIComponent(url).includes("공지사항"); }
  catch { return !url.toLowerCase().includes("%ea%b3%b5%ec%a7%80%ec%82%ac%ed%95%ad"); }
}

function EventBannerDetails({ banners, onOpenImage }) {
  if (!Array.isArray(banners) || !banners.length) return null;
  const kindLabel = { character: "캐릭터 픽업", weapon: "무기 픽업", mixed: "캐릭터 · 무기 픽업" };
  const phaseLabel = { first: "1차", second: "2차", unknown: "차수 미정" };
  return <section className="event-banners" aria-labelledby="event-banners-title"><header><div><span>OFFICIAL BANNER DATA</span><h3 id="event-banners-title">픽업 상세</h3></div><b>{banners.length}개 배너</b></header><div className="event-banners__list">{banners.map((banner, index) => { const images = [...new Set(banner.sourceImageUrls || [])].filter(isDisplayableBannerImage); return <article className="event-banner" key={`${banner.name}-${index}`}><div className="event-banner__heading"><div><strong>{banner.name}</strong><span>{kindLabel[banner.kind] || "픽업 배너"}</span></div><b>{phaseLabel[banner.phase] || "차수 미정"}</b></div>{images.length > 0 && <section className="event-banner__gallery"><h4><IconPhoto size={15} />공식 배너 이미지<b>{images.length}</b></h4><div>{images.map((url, imageIndex) => <button key={url} onClick={() => onOpenImage(images, imageIndex, banner.name)} aria-label={`${banner.name} 공식 이미지 ${imageIndex + 1} 확대`}><img src={url} alt={`${banner.name} 공식 이미지 ${imageIndex + 1}`} loading="lazy" /><span><IconPhoto size={14} />확대 보기</span></button>)}</div></section>}<div className="event-banner__columns"><BannerTargets icon={<IconUser size={15} />} title="픽업 캐릭터" targets={banner.featuredCharacters} /><BannerTargets icon={<IconSword size={15} />} title="픽업 무기" targets={banner.featuredWeapons} /></div></article>; })}</div></section>;
}

function BannerImageLightbox({ gallery, onClose, onMove }) {
  if (!gallery) return null;
  const { images, index, title } = gallery;
  return <div className="banner-lightbox" role="dialog" aria-modal="true" aria-label={`${title} 공식 이미지 확대`} onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><header><div><strong>{title}</strong><span>{index + 1} / {images.length}</span></div><button onClick={onClose} aria-label="이미지 닫기"><IconX size={22} /></button></header><div className="banner-lightbox__stage">{images.length > 1 && <button className="banner-lightbox__arrow banner-lightbox__arrow--prev" onClick={() => onMove(-1)} aria-label="이전 이미지"><IconChevronLeft size={28} /></button>}<img src={images[index]} alt={`${title} 공식 이미지 ${index + 1}`} />{images.length > 1 && <button className="banner-lightbox__arrow banner-lightbox__arrow--next" onClick={() => onMove(1)} aria-label="다음 이미지"><IconChevronRight size={28} /></button>}</div><footer><button onClick={() => openExternalUrl(images[index])}>원본 이미지 열기<IconExternalLink size={16} /></button></footer></div>;
}

function EventDetailModal({ item, onClose, notifications, toggleNotification }) {
  const [imageGallery, setImageGallery] = useState(null);
  useEffect(() => {
    if (!item) return undefined;
    const closeOnEscape = (event) => { if (event.key === "Escape") { if (imageGallery) setImageGallery(null); else onClose(); } if (imageGallery && event.key === "ArrowLeft") setImageGallery((current) => ({ ...current, index: (current.index - 1 + current.images.length) % current.images.length })); if (imageGallery && event.key === "ArrowRight") setImageGallery((current) => ({ ...current, index: (current.index + 1) % current.images.length })); };
    window.addEventListener("keydown", closeOnEscape); document.body.classList.add("modal-open");
    return () => { window.removeEventListener("keydown", closeOnEscape); document.body.classList.remove("modal-open"); };
  }, [item, onClose, imageGallery]);
  if (!item) return null;
  const game = games.find((entry) => entry.id === item.gameId);
  const notified = notifications.includes(item.id);
  const dateTime = (value) => value ? new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", year: "numeric", month: "long", day: "numeric", weekday: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(value)) : "미정";
  const openSource = () => openExternalUrl(item.sourceUrl);
  return <div className="event-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="event-modal" role="dialog" aria-modal="true" aria-labelledby="event-modal-title">
      <header><div className="event-modal__game"><GameMark game={game} /><div><span>{game.name}</span><small>공식 일정 상세</small></div></div><button className="event-modal__close" onClick={onClose} aria-label="닫기"><IconX size={20} /></button></header>
      <div className="event-modal__body">
        <div className="event-modal__badges"><span className={`type-badge type-badge--${item.typeKey}`}>{item.type}</span><span className={`status status--${item.statusKey}`}>{item.status}</span>{item.version && <span className="event-modal__version">v{item.version}</span>}</div>
        <h2 id="event-modal-title">{item.title}</h2>
        <p className="event-modal__summary">{item.summary || "공식 공지에서 확인된 일정입니다. 아래 원문에서 전체 안내와 참여 조건을 확인할 수 있습니다."}</p>
        <dl className="event-modal__facts"><div><dt>시작</dt><dd>{dateTime(item.startsAt)}</dd></div><div><dt>종료</dt><dd>{dateTime(item.endsAt)}</dd></div><div><dt>확인된 시간</dt><dd>{item.sourceTimeText || "공식 공지 참조"}</dd></div><div><dt>데이터 상태</dt><dd>{item.confidence === "confirmed" ? "공식 출처 확인 완료" : "확인 중"}</dd></div></dl>
        <EventBannerDetails banners={item.banners} onOpenImage={(images, index, title) => setImageGallery({ images, index, title })} />
        <aside className="event-modal__source"><IconFileText size={18} /><div><strong>공식 출처</strong><span>{item.sourceTitle || game.name}</span><small>{item.sourceUrl}</small></div></aside>
      </div>
      <footer><button className={`event-modal__notify ${notified ? "is-active" : ""}`} onClick={() => toggleNotification(item.id)}>{notified ? <IconBellFilled size={18} /> : <IconBell size={18} />}{notified ? "알림 설정됨" : "일정 알림 받기"}</button><button className="event-modal__source-button" onClick={openSource}>공식 원문 보기<IconExternalLink size={17} /></button></footer>
    </section><BannerImageLightbox gallery={imageGallery} onClose={() => setImageGallery(null)} onMove={(direction) => setImageGallery((current) => ({ ...current, index: (current.index + direction + current.images.length) % current.images.length }))} />
  </div>;
}

function NotificationPanel({ allItems, notifications, toggleNotification, embedded = false }) {
  const notifiedItems = allItems.filter((item) => notifications.includes(item.id));
  return <aside className={`notification-panel ${embedded ? "notification-panel--embedded" : ""}`}><header><div><h2>일정 알림 <b>{notifiedItems.length}</b></h2><span>선택한 일정 시작 1시간 전 알림</span></div></header><div className="notification-list">{notifiedItems.slice(0, embedded ? 50 : 5).map((item) => { const game = games.find((entry) => entry.id === item.gameId); return <article key={item.id}><time>{item.time}</time><GameMark game={game} size="sm" /><div><strong>{game.shortName}</strong><span>{item.title}</span><small>{item.reminder}</small></div><button onClick={() => toggleNotification(item.id)} aria-label="알림 제거"><IconX size={16} /></button></article>; })}{!notifiedItems.length && <div className="panel-empty"><IconBell size={26} /><span>등록된 알림이 없습니다.</span></div>}</div><button className="read-all" onClick={showTestNotification}>알림 테스트</button></aside>;
}

function RedemptionCodes({ searchQuery }) {
  const [view, setView] = useState("all");
  const [gameId, setGameId] = useState("");
  const [codes, setCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copiedId, setCopiedId] = useState("");
  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const result = await fetchRedemptionCodes(view, gameId);
      setCodes(result.codes);
      if (result.warning) setError(result.source === "cache" ? `캐시 데이터 표시 중 · ${result.warning}` : result.warning);
    } catch (loadError) {
      setCodes([]);
      setError(loadError.message || "리딤코드를 불러오지 못했습니다.");
    } finally { setLoading(false); }
  }, [view, gameId]);
  useEffect(() => { load(); }, [load]);
  const visibleCodes = useMemo(() => codes.filter((item) => `${item.code} ${item.sourceTitle || ""}`.toLowerCase().includes(searchQuery.toLowerCase())), [codes, searchQuery]);
  const copyCode = async (item) => {
    await navigator.clipboard.writeText(item.code);
    setCopiedId(item.id);
    window.setTimeout(() => setCopiedId(""), 1600);
  };
  const formatExpiry = (value) => value ? new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", month: "long", day: "numeric", weekday: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(value)) : "만료일 미정";
  return <section className="redemption-page">
    <header className="redemption-hero"><div><span className="redemption-hero__eyebrow">OFFICIAL REDEMPTION CODES</span><h1>리딤코드 보관함</h1><p>공식 공지에서 확인된 공용 코드만 모았습니다. 코드를 복사한 뒤 게임별 교환 페이지에서 사용하세요.</p></div><IconGift size={46} /></header>
    <div className="redemption-controls"><div className="redemption-tabs" role="tablist"><button role="tab" aria-selected={view === "all"} className={view === "all" ? "is-active" : ""} onClick={() => setView("all")}>전체 코드 <b>{view === "all" ? codes.length : ""}</b></button><button role="tab" aria-selected={view === "expiring-today"} className={view === "expiring-today" ? "is-active is-urgent" : ""} onClick={() => setView("expiring-today")}>오늘 만료 <b>{view === "expiring-today" ? codes.length : ""}</b></button></div><FilterSelect value={gameId} options={[{ label: "모든 게임", value: "" }, ...games.map((game) => ({ label: game.shortName, value: game.id }))]} onChange={setGameId} /></div>
    {error && <div className="redemption-warning"><span>{error}</span><button onClick={load}>다시 시도</button></div>}
    {loading ? <div className="empty-state"><IconRefresh className="spin-icon" size={28} /><strong>공식 리딤코드를 불러오는 중입니다</strong></div> : visibleCodes.length ? <div className="redemption-grid">{visibleCodes.map((item) => { const game = games.find((entry) => entry.id === item.gameId); const targetUrl = item.redemptionUrl || item.sourceUrl; return <article className="redemption-card" key={item.id}><header><GameMark game={game} /><div><strong>{game?.name || item.gameId}</strong><span className={`code-status code-status--${item.status}`}>{item.status === "active" ? "사용 가능" : item.status === "expired" ? "만료" : "기간 미정"}</span></div></header><button className="redemption-code" onClick={() => copyCode(item)} title="코드 복사"><code>{item.code}</code>{copiedId === item.id ? <IconCheck size={19} /> : <IconCopy size={19} />}</button><div className="redemption-expiry"><IconClock size={16} /><span>{formatExpiry(item.expiresAt)}</span></div><p>{item.sourceTitle}</p><footer><button onClick={() => copyCode(item)}>{copiedId === item.id ? "복사 완료" : "코드 복사"}</button><button onClick={() => openExternalUrl(targetUrl)}>{item.redemptionUrl ? "교환하러 가기" : "공식 공지 보기"}<IconExternalLink size={15} /></button></footer></article>; })}</div> : <div className="empty-state"><IconGift size={30} /><strong>{view === "expiring-today" ? "오늘 만료되는 리딤코드가 없습니다" : "조건에 맞는 리딤코드가 없습니다"}</strong><span>{gameId || searchQuery ? "게임 필터나 검색어를 바꿔보세요." : "새 공식 코드가 확인되면 여기에 표시됩니다."}</span></div>}
  </section>;
}

export function App() {
  const [page, setPage] = useState("schedule");
  const [selectedItem, setSelectedItem] = useState(null);
  const [pendingOpenEventId, setPendingOpenEventId] = useState(null);
  const [query, setQuery] = useState(""); const [gameFilter, setGameFilter] = useState("모든 게임"); const [dateFilter, setDateFilter] = useState(""); const [typeFilter, setTypeFilter] = useState("전체"); const [statusFilter, setStatusFilter] = useState("전체 상태"); const [showAll, setShowAll] = useState(false);
  const [subscribed, setSubscribed] = usePersistentState("gametime:subscriptions", games.map((game) => game.id));
  const [notifications, setNotifications, notificationsHydrated] = usePersistentState("gametime:notifications", []);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [reminderEvents, setReminderEvents] = useState(null);
  const [remoteGroups, setRemoteGroups] = useState([]);
  const [lastSyncedAt, setLastSyncedAt] = useState(null);
  const activeGroups = remoteGroups;
  const allItems = useMemo(() => activeGroups.flatMap((group) => group.items), [activeGroups]);
  const reminderItems = useMemo(() => reminderEvents ? toScheduleGroups(reminderEvents, games).flatMap((group) => group.items) : [], [reminderEvents]);
  const visibleGroups = useMemo(() => { const today = kstDateKey(); return activeGroups.map((group) => ({ ...group, items: group.items.filter((item) => { const game = games.find((entry) => entry.id === item.gameId); return subscribed.includes(item.gameId) && (gameFilter === "모든 게임" || game.shortName === gameFilter) && (typeFilter === "전체" || item.type === typeFilter) && (statusFilter === "전체 상태" || item.status === statusFilter) && (group.date === UNDATED_PICKUP_GROUP || showAll || dateFilter || group.date >= today) && (`${item.title} ${game.name}`.toLowerCase().includes(query.toLowerCase())); }) })).filter((group) => group.items.length); }, [activeGroups, query, gameFilter, dateFilter, typeFilter, statusFilter, showAll, subscribed]);
  const toggleGame = (id) => setSubscribed((current) => current.includes(id) ? current.filter((gameId) => gameId !== id) : [...current, id]);
  const toggleNotification = (id) => setNotifications((current) => current.includes(id) ? current.filter((itemId) => itemId !== id) : [...current, id]);
  const refresh = useCallback(async () => { setIsRefreshing(true); try { const [payload, allPayload] = dateFilter ? await Promise.all([fetchScheduleData(dateFilter), fetchScheduleData("")]) : [await fetchScheduleData(""), null]; if (!Array.isArray(payload.events) || (allPayload && !Array.isArray(allPayload.events))) throw new Error("events response is not an array"); const undatedPickups = (allPayload?.events || []).filter((event) => event.type === "banner" && !event.startsAt); const mergedEvents = [...payload.events, ...undatedPickups.filter((pickup) => !payload.events.some((event) => event.id === pickup.id))]; setReminderEvents(allPayload?.events || payload.events); setRemoteGroups(toScheduleGroups(mergedEvents, games)); const status = payload.status || allPayload?.status; if (status?.retrievedAt) setLastSyncedAt(status.retrievedAt); } catch (error) { console.error("공식 일정 API를 불러오지 못했습니다.", error); } finally { setIsRefreshing(false); } }, [dateFilter]);
  useEffect(() => { refresh(); const timer = window.setInterval(refresh, 5 * 60 * 1000); const removePlatformListener = onPlatformScheduleRefresh(refresh); const refreshWhenVisible = () => { if (document.visibilityState === "visible") refresh(); }; document.addEventListener("visibilitychange", refreshWhenVisible); return () => { window.clearInterval(timer); removePlatformListener(); document.removeEventListener("visibilitychange", refreshWhenVisible); }; }, [refresh]);
  useEffect(() => { let cleanup = () => {}; initializeNativeNotifications(setPendingOpenEventId).then((removeListener) => { cleanup = removeListener; }); return () => cleanup(); }, []);
  useEffect(() => { if (notificationsHydrated && reminderEvents) syncNativeReminders(reminderEvents, notifications).catch((error) => console.error("네이티브 알림을 동기화하지 못했습니다.", error)); }, [reminderEvents, notifications, notificationsHydrated]);
  useEffect(() => { if (!pendingOpenEventId) return; const item = reminderItems.find((event) => event.id === pendingOpenEventId); if (item) { setSelectedItem(item); setPage("schedule"); setPendingOpenEventId(null); } }, [reminderItems, pendingOpenEventId]);
  return <div className="app-shell"><Sidebar subscribed={subscribed} onToggleGame={toggleGame} page={page} setPage={setPage} notificationCount={notifications.length} lastSyncedAt={lastSyncedAt} /><main className="workspace"><header className="toolbar"><label className="search-box"><IconSearch size={19} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={page === "redemption" ? "코드, 공식 공지 검색" : "일정, 게임, 키워드 검색"} /><kbd>/</kbd></label>{page !== "redemption" && <div className="view-switch"><button className={page === "schedule" ? "is-active" : ""} onClick={() => setPage("schedule")}><IconLayoutList size={18} />목록</button><button className={page === "calendar" ? "is-active" : ""} onClick={() => setPage("calendar")}><IconCalendar size={18} />캘린더</button></div>}<button className={`refresh-button ${isRefreshing ? "is-loading" : ""}`} onClick={refresh} title="일정 새로고침"><IconRefresh size={19} /></button></header>{page !== "notifications" && page !== "redemption" && <section className="filters"><FilterSelect value={gameFilter} options={["모든 게임", ...games.map((game) => game.shortName)]} onChange={setGameFilter} /><label className={`date-filter ${dateFilter ? "has-value" : ""}`}><IconCalendar size={16} /><input type="date" value={dateFilter} onChange={(event) => setDateFilter(event.target.value)} aria-label="일정 날짜 검색" />{dateFilter && <button type="button" onClick={() => setDateFilter("")} aria-label="날짜 필터 초기화"><IconX size={14} /></button>}</label><FilterSelect value={typeFilter} options={typeLabels} onChange={setTypeFilter} /><FilterSelect value={statusFilter} options={statusLabels} onChange={setStatusFilter} /><label className="checkbox"><input type="checkbox" checked={showAll} onChange={(event) => setShowAll(event.target.checked)} /><span />전체보기</label><IconAdjustmentsHorizontal className="filter-icon" size={19} /></section>}<section className="content-area">{page === "redemption" ? <RedemptionCodes searchQuery={query} /> : page === "notifications" ? <NotificationPanel embedded allItems={reminderItems} notifications={notifications} toggleNotification={toggleNotification} /> : page === "calendar" ? <MiniCalendar groups={visibleGroups} onOpen={setSelectedItem} focusDate={dateFilter} /> : <Timeline groups={visibleGroups} notifications={notifications} toggleNotification={toggleNotification} onOpen={setSelectedItem} />}</section></main>{page !== "notifications" && page !== "redemption" && <NotificationPanel allItems={reminderItems} notifications={notifications} toggleNotification={toggleNotification} />}<EventDetailModal item={selectedItem} onClose={() => setSelectedItem(null)} notifications={notifications} toggleNotification={toggleNotification} /></div>;
}
