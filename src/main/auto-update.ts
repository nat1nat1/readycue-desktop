import { BrowserWindow, ipcMain } from "electron";
import { autoUpdater } from "electron-updater";

export function setupAutoUpdater(mainWindow: BrowserWindow): void {
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

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
    autoUpdater.quitAndInstall(false, true);
  });

  autoUpdater.checkForUpdates();
}
