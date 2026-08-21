import { CapacitorHttp } from "@capacitor/core";
import { overlapsDate } from "../core/schedules";
import { isMobileNative } from "./runtime";
import { readPreference, writePreference } from "./storage";

const API_ORIGIN = "https://subculture-schdule-api.vercel.app";

function bundledUrl(name) { return new URL(`./api/${name}.json`, window.location.href).toString(); }
function enabledGames(catalog) {
  if (!catalog || !Array.isArray(catalog.items)) throw new Error("games response is invalid");
  return catalog.items.filter((game) => game.enabled).sort((a, b) => a.sortOrder - b.sortOrder);
}
function filterByDate(events, date) { return date ? events.filter((event) => overlapsDate(event, date)) : events; }

async function bundledScheduleData(date, warning) {
  const [eventsResponse, gamesResponse, statusResponse] = await Promise.all([fetch(bundledUrl("events"), { cache: "no-store" }), fetch(bundledUrl("games"), { cache: "no-store" }), fetch(bundledUrl("collection-status"), { cache: "no-store" })]);
  if (!eventsResponse.ok || !gamesResponse.ok) throw new Error(warning || "bundled schedule data is unavailable");
  const [events, catalog] = await Promise.all([eventsResponse.json(), gamesResponse.json()]);
  return { events: filterByDate(events, date), games: enabledGames(catalog), status: statusResponse.ok ? await statusResponse.json() : null, source: "bundled", ...(warning ? { warning } : {}) };
}

async function fetchAllGameEvents(games, fetchPage) {
  return (await Promise.all(games.map(async (game) => {
    const items = []; let cursor = null;
    do {
      const page = await fetchPage(game.id, cursor);
      if (!page || !Array.isArray(page.items) || (page.nextCursor !== null && typeof page.nextCursor !== "string")) throw new Error(`${game.id} events response is invalid`);
      items.push(...page.items); cursor = page.nextCursor;
    } while (cursor);
    return items;
  }))).flat();
}

async function mobileGet(url) {
  const response = await CapacitorHttp.get({ url, headers: { accept: "application/json" } });
  if (response.status < 200 || response.status >= 300) throw new Error(`${url} returned ${response.status}`);
  return response.data;
}

async function mobileScheduleData(date) {
  const cacheKey = "gametime:schedule-cache:v2";
  try {
    const games = enabledGames(await mobileGet(`${API_ORIGIN}/api/v1/games`));
    const events = await fetchAllGameEvents(games, (gameId, cursor) => { const url = new URL("/api/v2/events", API_ORIGIN); url.searchParams.set("gameId", gameId); if (cursor) url.searchParams.set("cursor", cursor); return mobileGet(url.toString()); });
    const status = await mobileGet(`${API_ORIGIN}/api/v1/collection-status`).catch(() => null);
    const result = { events, games, status, source: "remote" }; await writePreference(cacheKey, result);
    return { ...result, events: filterByDate(events, date) };
  } catch (error) {
    const cached = await readPreference(cacheKey, null);
    if (cached?.events && cached?.games) return { ...cached, events: filterByDate(cached.events, date), source: "cache", warning: error.message };
    return bundledScheduleData(date, error.message);
  }
}

async function browserScheduleData(date) {
  try {
    const catalogResponse = await fetch("/remote-api/games", { cache: "no-store" });
    if (!catalogResponse.ok) throw new Error(`games ${catalogResponse.status}`);
    const games = enabledGames(await catalogResponse.json());
    const events = await fetchAllGameEvents(games, async (gameId, cursor) => { const query = new URLSearchParams({ gameId }); if (cursor) query.set("cursor", cursor); const response = await fetch(`/remote-api/events?${query}`, { cache: "no-store" }); if (!response.ok) throw new Error(`${gameId} events ${response.status}`); return response.json(); });
    const statusResponse = await fetch("/remote-api/collection-status", { cache: "no-store" });
    return { events: filterByDate(events, date), games, status: statusResponse.ok ? await statusResponse.json() : null, source: "remote" };
  } catch (error) { return bundledScheduleData(date, error.message); }
}

export async function fetchScheduleData(date = "") {
  if (window.electronAPI?.fetchScheduleData) return window.electronAPI.fetchScheduleData(date);
  return isMobileNative() ? mobileScheduleData(date) : browserScheduleData(date);
}
export function onPlatformScheduleRefresh(callback) { return window.electronAPI?.onRefreshSchedules?.(callback) || (() => {}); }
