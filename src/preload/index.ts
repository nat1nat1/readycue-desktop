import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("electronAPI", {
  isElectron: true,

  enableLoopbackAudio: () => ipcRenderer.invoke("enable-loopback-audio"),
  disableLoopbackAudio: () => ipcRenderer.invoke("disable-loopback-audio"),

  platform: process.platform,
  appVersion: ipcRenderer.sendSync("get-app-version") as string,

  openExternal: (url: string) => ipcRenderer.invoke("open-external", url),
  getWebTarget: () => ipcRenderer.invoke("get-web-target"),
  setWebTarget: (target: "prod" | "local") => ipcRenderer.invoke("set-web-target", target),
  onAuthBridgeToken: (callback: (payload: { token: string; next?: string }) => void) => {
    const handler = (
      _event: Electron.IpcRendererEvent,
      payload: { token: string; next?: string }
    ) => callback(payload);
    ipcRenderer.on("auth-bridge-token", handler);
    return () => ipcRenderer.removeListener("auth-bridge-token", handler);
  },
  consumeInitialAuthBridgeToken: () =>
    ipcRenderer.invoke("consume-initial-auth-bridge-token") as Promise<{
      token: string;
      next?: string;
    } | null>,

  checkForUpdates: () => ipcRenderer.invoke("check-for-updates"),
  restartToUpdate: () => ipcRenderer.invoke("restart-to-update"),
  onUpdateStatus: (callback: (status: Record<string, unknown>) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, data: Record<string, unknown>) => callback(data);
    ipcRenderer.on("update-status", handler);
    return () => ipcRenderer.removeListener("update-status", handler);
  },
  onAppCommand: (callback: (command: "browser-backward" | "browser-forward") => void) => {
    const handler = (
      _event: Electron.IpcRendererEvent,
      command: "browser-backward" | "browser-forward"
    ) => callback(command);
    ipcRenderer.on("app-command", handler);
    return () => ipcRenderer.removeListener("app-command", handler);
  },
});
