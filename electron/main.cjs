const { app, BrowserWindow, Menu, Notification, Tray, ipcMain, shell, nativeImage, net } = require("electron");
const { readFile, writeFile } = require("node:fs/promises");
const path = require("node:path");

const API_ORIGIN = "https://subculture-schdule-api.vercel.app";
const API_BASE = `${API_ORIGIN}/api/v1`;
let mainWindow; let tray;

function isValidEvents(events) {
  return Array.isArray(events) && events.every((event) => event && typeof event.id === "string" && typeof event.gameId === "string" && typeof event.title === "string" && typeof event.sourceUrl === "string" && event.sourceUrl.startsWith("https://"));
}

function isValidRedemptionCodes(codes) {
  return Array.isArray(codes) && codes.every((item) => item && typeof item.id === "string" && typeof item.gameId === "string" && typeof item.code === "string");
}

function redemptionCodesExpiringToday(codes) {
  const formatter = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" });
  const today = formatter.format(new Date());
  return codes.filter((item) => item.expiresAt && formatter.format(new Date(item.expiresAt)) === today);
}

async function fetchJson(url) {
  const response = await net.fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error(`${url} returned ${response.status}`);
  return response.json();
}

function isValidEventsPage(page) {
  return page && isValidEvents(page.items) && (page.nextCursor === null || typeof page.nextCursor === "string") && typeof page.total === "number";
}

function isValidGameCatalog(catalog) {
  return catalog && Array.isArray(catalog.items) && typeof catalog.updatedAt === "string" && catalog.items.every((game) => game && typeof game.id === "string" && typeof game.name === "string" && typeof game.shortName === "string" && typeof game.enabled === "boolean" && typeof game.sortOrder === "number");
}

async function bundledGameCatalog() {
  return readFile(path.join(__dirname, "../dist/client/api/games.json"), "utf8").then(JSON.parse);
}

async function gameCatalog() {
  const cachePath = path.join(app.getPath("userData"), "game-catalog-cache-v1.json");
  try {
    const catalog = await fetchJson(`${API_ORIGIN}/api/v1/games`);
    if (!isValidGameCatalog(catalog)) throw new Error("Invalid game catalog response");
    await writeFile(cachePath, JSON.stringify(catalog));
    return { catalog, source: "remote" };
  } catch (remoteError) {
    try {
      const cached = JSON.parse(await readFile(cachePath, "utf8"));
      if (isValidGameCatalog(cached)) return { catalog: cached, source: "cache", warning: remoteError.message };
    } catch {}
    return { catalog: await bundledGameCatalog(), source: "bundled", warning: remoteError.message };
  }
}

async function fetchGameEvents(gameId) {
  const items = [];
  let cursor = null;
  do {
    const url = new URL("/api/v2/events", API_ORIGIN);
    url.searchParams.set("gameId", gameId);
    if (cursor) url.searchParams.set("cursor", cursor);
    const page = await fetchJson(url.toString());
    if (!isValidEventsPage(page) || page.items.some((event) => event.gameId !== gameId)) throw new Error(`Invalid v2 events page for ${gameId}`);
    items.push(...page.items);
    cursor = page.nextCursor;
  } while (cursor);
  return items;
}

function filterEventsByDate(events, date) {
  if (!date) return events;
  let rangeStart; let rangeEnd;
  rangeStart = Date.parse(`${date}T00:00:00+09:00`); rangeEnd = Date.parse(`${date}T23:59:59.999+09:00`);
  return events.filter((event) => {
    const start = Date.parse(event.startsAt); const end = event.endsAt ? Date.parse(event.endsAt) : start;
    return !Number.isNaN(start) && start <= rangeEnd && end >= rangeStart;
  });
}

async function bundledScheduleData(date) {
  const apiDirectory = path.join(__dirname, "../dist/client/api");
  const [events, status] = await Promise.all([
    readFile(path.join(apiDirectory, "events.json"), "utf8").then(JSON.parse),
    readFile(path.join(apiDirectory, "collection-status.json"), "utf8").then(JSON.parse),
  ]);
  const filteredEvents = date === null ? events : filterEventsByDate(events, date);
  return { events: filteredEvents, status, source: "bundled" };
}

async function scheduleData(date = "") {
  const safeDate = /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : "";
  const cacheDirectory = app.getPath("userData");
  const bundled = await bundledScheduleData(null);
  const warnings = [];
  const catalogResult = await gameCatalog();
  if (catalogResult.warning) warnings.push(`games: ${catalogResult.warning}`);
  const enabledGames = catalogResult.catalog.items.filter((game) => game.enabled).sort((a, b) => a.sortOrder - b.sortOrder);
  const gameResults = await Promise.all(enabledGames.map(async ({ id: gameId }) => {
    const cachePath = path.join(cacheDirectory, `schedule-cache-v2-${gameId}.json`);
    try {
      const events = await fetchGameEvents(gameId);
      await writeFile(cachePath, JSON.stringify({ events, cachedAt: new Date().toISOString() }));
      return { events, source: "remote" };
    } catch (remoteError) {
      warnings.push(`${gameId}: ${remoteError.message}`);
      try {
        const cached = JSON.parse(await readFile(cachePath, "utf8"));
        if (isValidEvents(cached.events)) return { events: cached.events, source: "cache" };
      } catch {}
      return { events: bundled.events.filter((event) => event.gameId === gameId), source: "bundled" };
    }
  }));
  let status = bundled.status;
  try { status = await fetchJson(`${API_ORIGIN}/api/v1/collection-status`); } catch (error) { warnings.push(`collection-status: ${error.message}`); }
  const events = filterEventsByDate(gameResults.flatMap((result) => result.events), safeDate);
  const source = gameResults.every((result) => result.source === "remote") ? "remote" : "mixed";
  return { events, games: enabledGames, status, source, cachedAt: new Date().toISOString(), ...(warnings.length ? { warning: warnings.join("; ") } : {}) };
}

async function redemptionCodeData(view = "all", gameId = "") {
  const safeView = view === "expiring-today" ? "expiring-today" : "all";
  const safeGameId = ["monster", "wuthering", "genshin", "nte"].includes(gameId) ? gameId : "";
  const cachePath = path.join(app.getPath("userData"), `redemption-cache-${safeView}-${safeGameId || "all"}.json`);
  const route = safeView === "expiring-today" ? "redemption-codes/expiring-today" : "redemption-codes";
  const url = `${API_BASE}/${route}${safeGameId ? `?gameId=${encodeURIComponent(safeGameId)}` : ""}`;
  try {
    const codes = await fetchJson(url);
    if (!isValidRedemptionCodes(codes)) throw new Error("Invalid redemption code API response");
    const payload = { codes, source: "remote", cachedAt: new Date().toISOString() };
    await writeFile(cachePath, JSON.stringify(payload));
    return payload;
  } catch (remoteError) {
    try {
      const cached = JSON.parse(await readFile(cachePath, "utf8"));
      if (isValidRedemptionCodes(cached.codes)) return { ...cached, source: "cache", warning: remoteError.message };
    } catch {}
    if (safeView === "expiring-today") {
      const allUrl = `${API_BASE}/redemption-codes${safeGameId ? `?gameId=${encodeURIComponent(safeGameId)}` : ""}`;
      const allCodes = await fetchJson(allUrl);
      if (isValidRedemptionCodes(allCodes)) return { codes: redemptionCodesExpiringToday(allCodes), source: "derived", warning: "오늘 만료 API가 아직 제공되지 않아 전체 목록에서 KST 기준으로 계산했습니다." };
    }
    throw remoteError;
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({ width: 1440, height: 1024, minWidth: 900, minHeight: 650, show: !process.env.CAPTURE_PATH, backgroundColor: "#06111f", title: "게임타임", webPreferences: { preload: path.join(__dirname, "preload.cjs"), contextIsolation: true, nodeIntegration: false } });
  const devUrl = process.env.VITE_DEV_SERVER_URL;
  if (devUrl) mainWindow.loadURL(devUrl); else mainWindow.loadFile(path.join(__dirname, "../dist/client/index.html"));
  mainWindow.webContents.once("did-finish-load", async () => { if (process.env.CAPTURE_PATH) { await new Promise((resolve) => setTimeout(resolve, 1200)); const image = await mainWindow.webContents.capturePage(); require("fs").writeFileSync(process.env.CAPTURE_PATH, image.toPNG()); app.isQuitting = true; app.quit(); } });
  mainWindow.on("close", (event) => {
    if (process.platform === "darwin" && !app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });
}

function createTray() {
  if (process.platform !== "darwin") return;
  const icon = nativeImage.createFromNamedImage("NSActionTemplate"); if (icon.isEmpty()) return;
  icon.setTemplateImage(true); tray = new Tray(icon); tray.setToolTip("게임타임 - 오늘의 게임 일정");
  tray.setContextMenu(Menu.buildFromTemplate([{ label: "게임타임 열기", click: () => { mainWindow.show(); mainWindow.focus(); } }, { label: "오늘 일정 새로고침", click: () => mainWindow.webContents.send("refresh-schedules") }, { type: "separator" }, { label: "종료", click: () => { app.isQuitting = true; app.quit(); } }]));
  tray.on("double-click", () => mainWindow.show());
}

app.whenReady().then(() => {
  createWindow();
  ipcMain.handle("open-external", (_, url) => shell.openExternal(url));
  ipcMain.handle("test-notification", (_, title, body) => new Notification({ title, body }).show());
  ipcMain.handle("fetch-schedule-data", (_, date) => scheduleData(date));
  ipcMain.handle("fetch-redemption-codes", (_, view, gameId) => redemptionCodeData(view, gameId));
  createTray();
});
app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });
app.on("before-quit", () => { app.isQuitting = true; });
