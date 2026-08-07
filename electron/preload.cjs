const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  openExternal: (url) => ipcRenderer.invoke("open-external", url),
  testNotification: (title, body) => ipcRenderer.invoke("test-notification", title, body),
  fetchScheduleData: (date = "") => ipcRenderer.invoke("fetch-schedule-data", date),
  onRefreshSchedules: (callback) => {
    const listener = () => callback();
    ipcRenderer.on("refresh-schedules", listener);
    return () => ipcRenderer.removeListener("refresh-schedules", listener);
  },
});
