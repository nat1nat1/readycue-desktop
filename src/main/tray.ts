import { app, BrowserWindow, Menu, Tray, nativeImage } from "electron";
import { autoUpdater } from "electron-updater";
import * as path from "path";

let tray: Tray | null = null;
let updateStatusLabel = "";

function rebuildMenu(mainWindow: BrowserWindow): void {
  if (!tray) return;

  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: "Open ReadyCue",
      click: () => {
        mainWindow.show();
        mainWindow.focus();
      },
    },
    {
      label: "Start Live Session",
      click: () => {
        mainWindow.show();
        mainWindow.focus();
        mainWindow.webContents.executeJavaScript(
          'window.location.href = "/live"'
        );
      },
    },
    { type: "separator" },
    {
      label: `ReadyCue v${app.getVersion()}`,
      enabled: false,
    },
  ];

  if (updateStatusLabel) {
    template.push({
      label: updateStatusLabel,
      enabled: false,
    });
  }

  template.push({
    label: "Check for Updates",
    click: () => {
      updateStatusLabel = "Checking...";
      rebuildMenu(mainWindow);
      autoUpdater.checkForUpdates();
    },
  });

  template.push({ type: "separator" });
  template.push({
    label: "Quit",
    accelerator: "CmdOrCtrl+Q",
    click: () => {
      app.quit();
    },
  });

  tray.setContextMenu(Menu.buildFromTemplate(template));
}

export function createTray(mainWindow: BrowserWindow): void {
  const iconPath = path.join(__dirname, "..", "..", "assets", "trayTemplate.png");

  let icon = nativeImage.createFromPath(iconPath);
  if (icon.isEmpty()) {
    console.warn(`[tray] Icon not found at ${iconPath}, using empty fallback`);
    icon = nativeImage.createEmpty();
  }
  icon.setTemplateImage(true);

  tray = new Tray(icon);
  tray.setToolTip("ReadyCue");

  // Listen to auto-updater events to update the menu label
  autoUpdater.on("update-not-available", () => {
    updateStatusLabel = "Latest version (just checked!)";
    rebuildMenu(mainWindow);
  });

  autoUpdater.on("update-available", (info) => {
    updateStatusLabel = `Update available: v${info.version}`;
    rebuildMenu(mainWindow);
  });

  autoUpdater.on("download-progress", (progress) => {
    updateStatusLabel = `Downloading... ${Math.round(progress.percent)}%`;
    rebuildMenu(mainWindow);
  });

  autoUpdater.on("update-downloaded", (info) => {
    updateStatusLabel = `v${info.version} ready — restart to apply`;
    rebuildMenu(mainWindow);
  });

  autoUpdater.on("error", () => {
    updateStatusLabel = "Update check failed";
    rebuildMenu(mainWindow);
  });

  rebuildMenu(mainWindow);

  tray.on("click", () => {
    mainWindow.show();
    mainWindow.focus();
  });
}
