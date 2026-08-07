const { app, BrowserWindow } = require("electron");
const path = require("path");

app.whenReady().then(async () => {
  const errors = [];
  const window = new BrowserWindow({ show: false, width: 1440, height: 1024, webPreferences: { contextIsolation: true } });
  window.webContents.on("console-message", (_, level, message) => { if (level >= 2) errors.push(message); });
  await window.loadFile(path.join(__dirname, "../dist/client/index.html"));
  await new Promise((resolve) => setTimeout(resolve, 700));
  const result = await window.webContents.executeJavaScript(`(async () => {
    const beforeRows = document.querySelectorAll('.schedule-row').length;
    document.querySelector('.view-switch button:nth-child(2)').click();
    await new Promise(r => setTimeout(r, 50));
    const calendarVisible = Boolean(document.querySelector('.calendar-view'));
    document.querySelector('.view-switch button:first-child').click();
    const input = document.querySelector('.search-box input');
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    setter.call(input, '특별 방송');
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise(r => setTimeout(r, 50));
    const filteredRows = document.querySelectorAll('.schedule-row').length;
    document.querySelector('.game-row').click();
    await new Promise(r => setTimeout(r, 50));
    const subscriptionSaved = Boolean(localStorage.getItem('gametime:subscriptions'));
    return { beforeRows, calendarVisible, filteredRows, subscriptionSaved };
  })()`);
  console.log(JSON.stringify({ ...result, consoleErrors: errors }, null, 2));
  app.quit();
});
