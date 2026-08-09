const { app, Notification } = require("electron");

app.whenReady().then(() => {
  const supported = Notification.isSupported();
  console.log(`Electron notification supported: ${supported}`);
  if (!supported) {
    app.exit(1);
    return;
  }

  const notification = new Notification({
    title: "게임타임 Electron 알림 테스트",
    body: "Electron 네이티브 알림이 정상적으로 연결되었습니다.",
  });
  notification.on("show", () => console.log("Electron notification shown: true"));
  notification.on("failed", (_, error) => {
    console.error("Electron notification failed:", error);
    app.exit(1);
  });
  notification.show();
  setTimeout(() => app.quit(), 5000);
});
