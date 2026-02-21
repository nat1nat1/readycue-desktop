import { app, BrowserWindow, Menu, Tray, nativeImage } from "electron";
import * as path from "path";

let tray: Tray | null = null;

export function createTray(mainWindow: BrowserWindow): void {
  const iconPath = path.join(__dirname, "..", "..", "assets", "trayTemplate.png");

  // Use a fallback 16x16 empty image if the asset doesn't exist yet
  let icon: Electron.NativeImage;
  try {
    icon = nativeImage.createFromPath(iconPath);
  } catch {
    icon = nativeImage.createEmpty();
  }

  tray = new Tray(icon);
  tray.setToolTip("ReadyCue");

  const contextMenu = Menu.buildFromTemplate([
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
      label: `About ReadyCue v${app.getVersion()}`,
      enabled: false,
    },
    {
      label: "Check for Updates",
      click: () => {
        const { autoUpdater } = require("electron-updater");
        autoUpdater.checkForUpdatesAndNotify();
      },
    },
    { type: "separator" },
    {
      label: "Quit",
      accelerator: "CmdOrCtrl+Q",
      click: () => {
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);

  tray.on("click", () => {
    mainWindow.show();
    mainWindow.focus();
  });
}
