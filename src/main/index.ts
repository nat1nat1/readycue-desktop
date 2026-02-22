import { app, BrowserWindow, ipcMain, shell } from "electron";
import { initMain } from "electron-audio-loopback";
import * as path from "path";
import { createTray } from "./tray";
import { setupAutoUpdater } from "./auto-update";

// Must be called before app.ready to set Chromium flags
initMain();

// Register as default handler for readycue:// protocol
if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient("readycue", process.execPath, [path.resolve(process.argv[1])]);
  }
} else {
  app.setAsDefaultProtocolClient("readycue");
}

ipcMain.on("get-app-version", (event) => {
  event.returnValue = app.getVersion();
});

const READYCUE_URL = process.env.READYCUE_URL || "https://readycue.ai";
const IS_DEV = READYCUE_URL.includes("localhost");

let mainWindow: BrowserWindow | null = null;
let isQuitting = false;

function createWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1280,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    titleBarStyle: "hiddenInset",
    trafficLightPosition: { x: 16, y: 16 },
    backgroundColor: "#0a0b1a",
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "..", "preload", "index.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  win.loadURL(READYCUE_URL);

  win.once("ready-to-show", () => {
    win.show();
  });

  // Open external links in the default browser
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("http")) {
      shell.openExternal(url);
    }
    return { action: "deny" };
  });

  // Offline detection: show a retry page when load fails
  win.webContents.on("did-fail-load", (_event, errorCode, errorDescription) => {
    if (errorCode === -3) return; // Aborted navigations, ignore
    console.error(`[load] Failed: ${errorCode} ${errorDescription}`);
    win.loadFile(path.join(__dirname, "..", "..", "assets", "offline.html"));
  });

  // macOS: hide window instead of closing (re-show on dock click)
  win.on("close", (event) => {
    if (!isQuitting) {
      event.preventDefault();
      win.hide();
    }
  });

  return win;
}

app.on("ready", () => {
  mainWindow = createWindow();
  createTray(mainWindow);

  if (!IS_DEV) {
    setupAutoUpdater(mainWindow);
  }
});

// macOS: re-show window when dock icon is clicked
app.on("activate", () => {
  if (mainWindow) {
    mainWindow.show();
  } else {
    mainWindow = createWindow();
  }
});

// Handle readycue:// deep links (macOS)
app.on("open-url", (event, url) => {
  event.preventDefault();
  const route = url.replace("readycue://", "/").replace(/\/$/, "") || "/";
  if (mainWindow) {
    mainWindow.show();
    mainWindow.focus();
    mainWindow.loadURL(`${READYCUE_URL}${route}`);
  }
});

app.on("before-quit", () => {
  isQuitting = true;
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
