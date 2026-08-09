const { app, BrowserWindow, Menu, Notification, Tray, ipcMain, shell, nativeImage, net } = require("electron");
const { readFile, writeFile } = require("node:fs/promises");
const path = require("node:path");

const API_BASE = "https://subculture-schdule-api.vercel.app/api/v1";
let mainWindow; let tray;

function isValidEvents(events) {
  return Array.isArray(events) && events.every((event) => event && typeof event.id === "string" && typeof event.gameId === "string" && typeof event.title === "string" && typeof event.sourceUrl === "string" && event.sourceUrl.startsWith("https://"));
}

async function fetchJson(url) {
  const response = await net.fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error(`${url} returned ${response.status}`);
  return response.json();
}

async function bundledScheduleData(date) {
  const apiDirectory = path.join(__dirname, "../dist/client/api");
  const [events, status] = await Promise.all([
    readFile(path.join(apiDirectory, "events.json"), "utf8").then(JSON.parse),
    readFile(path.join(apiDirectory, "collection-status.json"), "utf8").then(JSON.parse),
  ]);
  const filteredEvents = date ? events.filter((event) => {
    const start = Date.parse(event.startsAt); const end = event.endsAt ? Date.parse(event.endsAt) : start;
    const dayStart = Date.parse(`${date}T00:00:00+09:00`); const dayEnd = Date.parse(`${date}T23:59:59.999+09:00`);
    return !Number.isNaN(start) && start <= dayEnd && end >= dayStart;
  }) : events;
  return { events: filteredEvents, status, source: "bundled" };
}

async function scheduleData(date = "") {
  const safeDate = /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : "";
  const cachePath = path.join(app.getPath("userData"), `schedule-cache-${safeDate || "all"}.json`);
  try {
    const eventUrl = `${API_BASE}/events${safeDate ? `?date=${encodeURIComponent(safeDate)}` : ""}`;
    const [events, status] = await Promise.all([fetchJson(eventUrl), fetchJson(`${API_BASE}/collection-status`)]);
    if (!isValidEvents(events) || !status || typeof status.retrievedAt !== "string") throw new Error("Invalid schedule API response");
    const payload = { events, status, source: "remote", cachedAt: new Date().toISOString() };
    await writeFile(cachePath, JSON.stringify(payload));
    return payload;
  } catch (remoteError) {
    try {
      const cached = JSON.parse(await readFile(cachePath, "utf8"));
      if (isValidEvents(cached.events)) return { ...cached, source: "cache", warning: remoteError.message };
    } catch {}
    return { ...(await bundledScheduleData(safeDate)), warning: remoteError.message };
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
  createTray();
});
app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });
app.on("before-quit", () => { app.isQuitting = true; });
