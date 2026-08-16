import { CapacitorHttp } from "@capacitor/core";
import { isMobileNative } from "./runtime";
import { readPreference, writePreference } from "./storage";

const API_BASE = "https://subculture-schdule-api.vercel.app/api/v1";

function isValidCodes(codes) {
  return Array.isArray(codes) && codes.every((item) => item && typeof item.id === "string" && typeof item.gameId === "string" && typeof item.code === "string");
}

function expiringToday(codes) {
  const formatter = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" });
  const today = formatter.format(new Date());
  return codes.filter((item) => item.expiresAt && formatter.format(new Date(item.expiresAt)) === today);
}

function endpointFor(view, gameId) {
  const path = view === "expiring-today" ? "/redemption-codes/expiring-today" : "/redemption-codes";
  return `${path}${gameId ? `?gameId=${encodeURIComponent(gameId)}` : ""}`;
}

async function mobileRedemptionCodes(view, gameId) {
  const endpoint = endpointFor(view, gameId);
  const cacheKey = `gametime:redemption-cache:${view}:${gameId || "all"}`;
  try {
    const response = await CapacitorHttp.get({ url: `${API_BASE}${endpoint}`, headers: { accept: "application/json" } });
    if (response.status < 200 || response.status >= 300 || !isValidCodes(response.data)) throw new Error(`redemption codes ${response.status}`);
    await writePreference(cacheKey, response.data);
    return { codes: response.data, source: "remote" };
  } catch (error) {
    const cached = await readPreference(cacheKey, null);
    if (isValidCodes(cached)) return { codes: cached, source: "cache", warning: error.message };
    if (view === "expiring-today") {
      const response = await CapacitorHttp.get({ url: `${API_BASE}${endpointFor("all", gameId)}`, headers: { accept: "application/json" } });
      if (response.status >= 200 && response.status < 300 && isValidCodes(response.data)) return { codes: expiringToday(response.data), source: "derived", warning: "오늘 만료 API가 아직 제공되지 않아 전체 목록에서 KST 기준으로 계산했습니다." };
    }
    throw error;
  }
}

async function browserRedemptionCodes(view, gameId) {
  let response = await fetch(`/remote-api${endpointFor(view, gameId)}`, { cache: "no-store" });
  let warning = "";
  if (!response.ok && view === "expiring-today") {
    response = await fetch(`/remote-api${endpointFor("all", gameId)}`, { cache: "no-store" });
    warning = "오늘 만료 API가 아직 제공되지 않아 전체 목록에서 KST 기준으로 계산했습니다.";
  }
  if (!response.ok) throw new Error(`redemption codes ${response.status}`);
  const codes = await response.json();
  if (!isValidCodes(codes)) throw new Error("Invalid redemption code API response");
  return { codes: warning ? expiringToday(codes) : codes, source: warning ? "derived" : "remote", ...(warning ? { warning } : {}) };
}

export async function fetchRedemptionCodes(view = "all", gameId = "") {
  if (window.electronAPI?.fetchRedemptionCodes) return window.electronAPI.fetchRedemptionCodes(view, gameId);
  return isMobileNative() ? mobileRedemptionCodes(view, gameId) : browserRedemptionCodes(view, gameId);
}
