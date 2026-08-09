import { CapacitorHttp } from "@capacitor/core";
import { overlapsDate } from "../core/schedules";
import { isMobileNative } from "./runtime";
import { readPreference, writePreference } from "./storage";

const API_BASE = "https://subculture-schdule-api.vercel.app/api/v1";

function bundledUrl(name) {
  return new URL(`./api/${name}.json`, window.location.href).toString();
}

async function bundledScheduleData(date, warning) {
  const [eventsResponse, statusResponse] = await Promise.all([fetch(bundledUrl("events"), { cache: "no-store" }), fetch(bundledUrl("collection-status"), { cache: "no-store" })]);
  if (!eventsResponse.ok) throw new Error(warning || `bundled events ${eventsResponse.status}`);
  const events = await eventsResponse.json();
  return { events: date ? events.filter((event) => overlapsDate(event, date)) : events, status: statusResponse.ok ? await statusResponse.json() : null, source: "bundled", ...(warning ? { warning } : {}) };
}

async function mobileScheduleData(date) {
  const query = date ? `?date=${encodeURIComponent(date)}` : "";
  const cacheKey = `gametime:schedule-cache:${date || "all"}`;
  try {
    const [eventsResponse, statusResponse] = await Promise.all([
      CapacitorHttp.get({ url: `${API_BASE}/events${query}`, headers: { accept: "application/json" } }),
      CapacitorHttp.get({ url: `${API_BASE}/collection-status`, headers: { accept: "application/json" } }),
    ]);
    if (eventsResponse.status < 200 || eventsResponse.status >= 300) throw new Error(`events ${eventsResponse.status}`);
    const result = { events: eventsResponse.data, status: statusResponse.status >= 200 && statusResponse.status < 300 ? statusResponse.data : null, source: "remote" };
    await writePreference(cacheKey, result);
    return result;
  } catch (error) {
    const cached = await readPreference(cacheKey, null);
    if (cached?.events) return { ...cached, source: "cache", warning: error.message };
    return bundledScheduleData(date, error.message);
  }
}

async function browserScheduleData(date) {
  const query = date ? `?date=${encodeURIComponent(date)}` : "";
  try {
    const [eventsResponse, statusResponse] = await Promise.all([fetch(`/remote-api/events${query}`, { cache: "no-store" }), fetch("/remote-api/collection-status", { cache: "no-store" })]);
    if (!eventsResponse.ok) throw new Error(`events ${eventsResponse.status}`);
    return { events: await eventsResponse.json(), status: statusResponse.ok ? await statusResponse.json() : null, source: "remote" };
  } catch (error) {
    return bundledScheduleData(date, error.message);
  }
}

export async function fetchScheduleData(date = "") {
  if (window.electronAPI?.fetchScheduleData) return window.electronAPI.fetchScheduleData(date);
  return isMobileNative() ? mobileScheduleData(date) : browserScheduleData(date);
}

export function onPlatformScheduleRefresh(callback) {
  return window.electronAPI?.onRefreshSchedules?.(callback) || (() => {});
}
