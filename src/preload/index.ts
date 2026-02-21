import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("electronAPI", {
  isElectron: true,

  enableLoopbackAudio: () => ipcRenderer.invoke("enable-loopback-audio"),

  disableLoopbackAudio: () => ipcRenderer.invoke("disable-loopback-audio"),

  platform: process.platform,

  appVersion: ipcRenderer.sendSync("get-app-version") as string,
});
