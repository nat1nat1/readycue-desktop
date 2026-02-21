import { autoUpdater } from "electron-updater";

export function setupAutoUpdater(): void {
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on("checking-for-update", () => {
    console.log("[update] Checking for updates...");
  });

  autoUpdater.on("update-available", (info) => {
    console.log(`[update] Update available: ${info.version}`);
  });

  autoUpdater.on("update-not-available", () => {
    console.log("[update] Already up to date");
  });

  autoUpdater.on("download-progress", (progress) => {
    console.log(`[update] Downloading: ${Math.round(progress.percent)}%`);
  });

  autoUpdater.on("update-downloaded", (info) => {
    console.log(`[update] Downloaded v${info.version}, will install on quit`);
  });

  autoUpdater.on("error", (err) => {
    console.error("[update] Error:", err.message);
  });

  autoUpdater.checkForUpdatesAndNotify();
}
