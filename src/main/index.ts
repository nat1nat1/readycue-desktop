import { app, BrowserWindow, desktopCapturer, globalShortcut, ipcMain, shell } from "electron";
import { initMain } from "electron-audio-loopback";
import Store from "electron-store";
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

ipcMain.handle("open-external", (_event, url: string) => {
  if (typeof url === "string" && (url.startsWith("http") || url.startsWith("x-apple."))) {
    return shell.openExternal(url);
  }
});

type WebTarget = "prod" | "local";
type PreferencesStore = {
  get: (key: "webTarget", defaultValue: WebTarget) => WebTarget;
  set: (key: "webTarget", value: WebTarget) => void;
};

const PROD_URL = "https://readycue.ai";
const LOCAL_URL = "http://localhost:3000";
const ENV_READYCUE_URL = process.env.READYCUE_URL?.trim();
const preferences = new (Store as unknown as {
  new (options: { name: string; defaults: { webTarget: WebTarget } }): PreferencesStore;
})({
  name: "readycue-desktop-preferences",
  defaults: {
    webTarget: "prod",
  },
});

let mainWindow: BrowserWindow | null = null;
let isQuitting = false;
let currentWebTarget: WebTarget = preferences.get("webTarget", "prod");
type AuthBridgePayload = { token: string; next?: string };
let pendingAuthBridgePayload: AuthBridgePayload | null = null;

function isLocalUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";
  } catch {
    return false;
  }
}

function getResolvedBaseUrl(): string {
  if (ENV_READYCUE_URL) return ENV_READYCUE_URL;
  return currentWebTarget === "local" ? LOCAL_URL : PROD_URL;
}

function getEffectiveWebTarget(): WebTarget {
  return isLocalUrl(getResolvedBaseUrl()) ? "local" : "prod";
}

function getCurrentRoutePath(win: BrowserWindow): string {
  const currentUrl = win.webContents.getURL();
  if (!currentUrl) return "/";

  try {
    const parsed = new URL(currentUrl);
    const route = `${parsed.pathname}${parsed.search}${parsed.hash}`.trim();
    return route || "/";
  } catch {
    return "/";
  }
}

ipcMain.handle("get-web-target", () => {
  return getEffectiveWebTarget();
});

ipcMain.handle("set-web-target", (_event, target: WebTarget) => {
  if (target !== "prod" && target !== "local") {
    throw new Error("invalid_web_target");
  }

  currentWebTarget = target;
  preferences.set("webTarget", target);

  if (mainWindow) {
    const route = getCurrentRoutePath(mainWindow);
    const nextUrl = new URL(route, getResolvedBaseUrl()).toString();
    mainWindow.loadURL(nextUrl);
  }

  return getEffectiveWebTarget();
});

ipcMain.handle("consume-initial-auth-bridge-token", () => {
  const payload = pendingAuthBridgePayload;
  pendingAuthBridgePayload = null;
  return payload;
});

function parseAuthBridgeDeepLink(deepLinkUrl: string): AuthBridgePayload | null {
  try {
    const parsed = new URL(deepLinkUrl.replace(/^readycue:\/\//, "https://placeholder.local/"));
    if (parsed.pathname !== "/auth-bridge") return null;

    const token = parsed.searchParams.get("token");
    if (!token) return null;

    const next = parsed.searchParams.get("next") ?? undefined;
    return { token, next };
  } catch {
    return null;
  }
}

function dispatchPendingAuthBridgePayload() {
  if (!mainWindow || !pendingAuthBridgePayload) return;
  mainWindow.webContents.send("auth-bridge-token", pendingAuthBridgePayload);
}

function ensureAuthBridgeFallbackRoute(win: BrowserWindow) {
  if (!pendingAuthBridgePayload) return;
  const currentPath = getCurrentRoutePath(win);
  if (currentPath.startsWith("/login")) return;

  const loginUrl = new URL("/login", getResolvedBaseUrl());
  loginUrl.searchParams.set("bridge_token", pendingAuthBridgePayload.token);
  win.loadURL(loginUrl.toString());
}

function createWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1280,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    titleBarStyle: "hiddenInset",
    trafficLightPosition: { x: 16, y: 13 },
    backgroundColor: "#0a0b1a",
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "..", "preload", "index.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  win.loadURL(getResolvedBaseUrl());

  win.once("ready-to-show", () => {
    win.show();
  });

  // Auto-select screen source for getDisplayMedia (bypasses macOS picker dialog)
  win.webContents.session.setDisplayMediaRequestHandler(async (_request, callback) => {
    const sources = await desktopCapturer.getSources({ types: ["screen"] });
    callback({ video: sources[0], audio: "loopback" });
  });

  // Open external links in the default browser
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("http")) {
      shell.openExternal(url);
    }
    return { action: "deny" };
  });

  // Generic browser navigation commands (mouse back/forward buttons, OS-level app commands)
  win.on("app-command", (_event, command) => {
    if (command === "browser-backward") {
      win.webContents.send("app-command", "browser-backward");
    } else if (command === "browser-forward") {
      win.webContents.send("app-command", "browser-forward");
    }
  });

  // Offline detection: show a retry page when load fails
  win.webContents.on("did-fail-load", (_event, errorCode, errorDescription) => {
    if (errorCode === -3) return; // Aborted navigations, ignore
    console.error(`[load] Failed: ${errorCode} ${errorDescription}`);
    if (getEffectiveWebTarget() === "local") {
      currentWebTarget = "prod";
      preferences.set("webTarget", "prod");
      win.loadURL(PROD_URL);
      return;
    }
    win.loadFile(path.join(__dirname, "..", "..", "assets", "offline.html"));
  });

  // macOS: hide window instead of closing (re-show on dock click)
  win.on("close", (event) => {
    if (!isQuitting) {
      event.preventDefault();
      win.hide();
    }
  });

  // Replay queued auth payload after renderer loads (cold start path).
  win.webContents.on("did-finish-load", () => {
    dispatchPendingAuthBridgePayload();
    ensureAuthBridgeFallbackRoute(win);
  });

  return win;
}

app.on("ready", () => {
  mainWindow = createWindow();
  createTray(mainWindow);

  globalShortcut.register("CmdOrCtrl+Shift+I", () => {
    mainWindow?.webContents.toggleDevTools();
  });

  if (!isLocalUrl(getResolvedBaseUrl())) {
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

  const authBridge = parseAuthBridgeDeepLink(url);
  if (authBridge) {
    pendingAuthBridgePayload = authBridge;

    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
      dispatchPendingAuthBridgePayload();
      ensureAuthBridgeFallbackRoute(mainWindow);
    }
    return;
  }

  if (!mainWindow) return;

  mainWindow.show();
  mainWindow.focus();

  // Generic deep link: strip readycue:// and load as web route
  const route = url.replace("readycue://", "/").replace(/\/$/, "") || "/";
  mainWindow.loadURL(new URL(route, getResolvedBaseUrl()).toString());
});

app.on("before-quit", () => {
  isQuitting = true;
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
