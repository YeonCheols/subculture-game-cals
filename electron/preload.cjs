const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("electronAPI",{openExternal:url=>ipcRenderer.invoke("open-external",url),testNotification:(title,body)=>ipcRenderer.invoke("test-notification",title,body)});
