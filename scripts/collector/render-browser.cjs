const { app, BrowserWindow } = require("electron");
const { readFileSync, writeFileSync } = require("node:fs");

const [inputPath, outputPath] = process.argv.slice(2);
if (!inputPath || !outputPath) process.exit(2);

app.commandLine.appendSwitch("disable-gpu");
app.whenReady().then(async () => {
  const urls = JSON.parse(readFileSync(inputPath, "utf8"));
  const window = new BrowserWindow({ show: false, webPreferences: { contextIsolation: true, nodeIntegration: false } });
  const results = [];
  for (const url of urls) {
    try {
      await window.loadURL(url);
      await new Promise((resolve) => setTimeout(resolve, 2500));
      const body = await window.webContents.executeJavaScript("document.documentElement.outerHTML");
      const resourceUrls = await window.webContents.executeJavaScript("performance.getEntriesByType('resource').map((entry) => entry.name)");
      results.push({ url, finalUrl: window.webContents.getURL(), body, resourceUrls });
    } catch (error) {
      results.push({ url, error: error.message });
    }
  }
  writeFileSync(outputPath, JSON.stringify(results));
  app.quit();
});
