import { BrowserWindow, ipcMain } from "electron";
import { autoUpdater } from "electron-updater";

export function setupAutoUpdater(mainWindow: BrowserWindow): void {
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  function installDownloadedUpdate(source: string) {
    try {
      console.info(`[update] Applying downloaded update via ${source}`);
      // Use silent + force-run to avoid incomplete handoff on macOS quit/hide flows.
      autoUpdater.quitAndInstall(true, true);
    } catch (err) {
      const message = err instanceof Error ? err.message : "unknown quitAndInstall error";
      console.error("[update] Failed to apply downloaded update:", message);
      sendStatus("error", { message });
    }
  }

  function sendStatus(status: string, detail?: Record<string, unknown>) {
    mainWindow.webContents.send("update-status", { status, ...detail });
  }

  autoUpdater.on("checking-for-update", () => {
    sendStatus("checking");
  });

  autoUpdater.on("update-available", (info) => {
    sendStatus("available", { version: info.version });
  });

  autoUpdater.on("update-not-available", () => {
    sendStatus("up-to-date");
  });

  autoUpdater.on("download-progress", (progress) => {
    sendStatus("downloading", { percent: Math.round(progress.percent) });
  });

  autoUpdater.on("update-downloaded", (info) => {
    sendStatus("ready", { version: info.version });
  });

  autoUpdater.on("error", (err) => {
    console.error("[update] Error:", err.message);
    sendStatus("error", { message: err.message });
  });

  ipcMain.handle("check-for-updates", () => {
    autoUpdater.checkForUpdates();
  });

  ipcMain.handle("restart-to-update", () => {
    installDownloadedUpdate("renderer_restart_button");
  });

  autoUpdater.checkForUpdates();
}
