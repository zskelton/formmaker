const { app, BrowserWindow, nativeImage, dialog } = require("electron");
const { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const APP_NAME = "Formmaker";
const DEV_URL = process.env.VITE_DEV_SERVER_URL || "http://localhost:3417";
const PROD_HOST = "127.0.0.1";
const PROD_PORT = 3417;

let mainWindow = null;
let splashWindow = null;
let prodServerHandle = null;
let prodServerUrl = `http://${PROD_HOST}:${PROD_PORT}`;

const hasSingleInstanceLock = app.requestSingleInstanceLock();

if (!hasSingleInstanceLock) {
  app.quit();
}

app.setName(APP_NAME);

function getRuntimeDir() {
  return app.getAppPath();
}

// In packaged mode, Vinext may be reachable from app.asar or unpacked resources.
// Keep a small candidate list instead of assuming one location.
function resolveVinextProdServerPath() {
  const appPath = app.getAppPath();
  const resourcesPath = process.resourcesPath;
  const vinextProdServerCandidates = [
    path.join(appPath, "node_modules", "vinext", "dist", "server", "prod-server.js"),
    path.join(resourcesPath, "app.asar", "node_modules", "vinext", "dist", "server", "prod-server.js"),
    path.join(resourcesPath, "app", "node_modules", "vinext", "dist", "server", "prod-server.js")
  ];

  return vinextProdServerCandidates.find((candidate) => existsSync(candidate));
}

function runPackagedSelfCheck() {
  const runtimeDir = getRuntimeDir();
  const expectedDistDir = path.join(runtimeDir, "dist");
  const expectedDataDir = path.join(runtimeDir, "app", "data");
  const vinextProdServerPath = resolveVinextProdServerPath();

  const issues = [];

  if (!existsSync(expectedDistDir)) {
    issues.push(`Missing runtime build output: ${expectedDistDir}`);
  }

  if (!existsSync(expectedDataDir)) {
    issues.push(`Missing PDF data directory: ${expectedDataDir}`);
  }

  if (!vinextProdServerPath) {
    issues.push("Missing vinext production server module in packaged resources");
  }

  return {
    issues,
    runtimeDir,
    expectedDistDir,
    expectedDataDir,
    vinextProdServerPath: vinextProdServerPath ?? "not-found"
  };
}

// Source PDFs are shipped with the app, but their exact packaged path can vary
// between builds/environments. Resolve the first existing location.
function resolveBundledDataDir() {
  const runtimeDir = getRuntimeDir();
  const candidates = [
    path.join(runtimeDir, "app", "data"),
    path.join(runtimeDir, "data"),
    path.join(process.resourcesPath, "app", "data"),
    path.join(process.resourcesPath, "data")
  ];

  return candidates.find((candidate) => existsSync(candidate)) ?? candidates[0];
}

// Installed apps cannot reliably write inside packaged resources. Copy PDFs to a
// writable userData folder once, then point API routes at that folder via env.
function ensureWritablePdfDataDir() {
  const writableDataDir = path.join(app.getPath("userData"), "data");
  const bundledDataDir = resolveBundledDataDir();

  mkdirSync(writableDataDir, { recursive: true });

  const copyRecursively = (sourceDir, targetDir) => {
    const entries = readdirSync(sourceDir, { withFileTypes: true });

    for (const entry of entries) {
      const sourcePath = path.join(sourceDir, entry.name);
      const targetPath = path.join(targetDir, entry.name);

      if (entry.isDirectory()) {
        mkdirSync(targetPath, { recursive: true });
        copyRecursively(sourcePath, targetPath);
        continue;
      }

      if (!existsSync(targetPath)) {
        writeFileSync(targetPath, readFileSync(sourcePath));
      }
    }
  };

  if (existsSync(bundledDataDir)) {
    try {
      copyRecursively(bundledDataDir, writableDataDir);
    } catch (error) {
      console.error("Failed to copy bundled PDF data files:", error);
    }
  }

  process.env.FORMMAKER_DATA_DIR = writableDataDir;
  return { writableDataDir, bundledDataDir };
}

function showStartupErrorDialog(error, diagnostics) {
  const extra = diagnostics
    ? `\n\nDiagnostics:\n- Runtime Dir: ${diagnostics.runtimeDir}\n- Dist Dir: ${diagnostics.expectedDistDir}\n- Data Dir: ${diagnostics.expectedDataDir}\n- Vinext Prod Server: ${diagnostics.vinextProdServerPath}`
    : "";

  const details = `${error instanceof Error ? error.message : String(error)}${extra}`;

  dialog.showErrorBox(
    "Formmaker Startup Error",
    `Formmaker could not start on this computer.\n\n${details}\n\nPlease reinstall from the latest installer and try again.`
  );
}

function getIconPath() {
  return path.join(app.getAppPath(), "app", "icon.png");
}

function getAppIcon() {
  const icon = nativeImage.createFromPath(getIconPath());
  return icon.isEmpty() ? undefined : icon;
}

function createSplashWindow() {
  if (splashWindow && !splashWindow.isDestroyed()) {
    return;
  }

  splashWindow = new BrowserWindow({
    width: 460,
    height: 320,
    resizable: false,
    maximizable: false,
    minimizable: false,
    frame: false,
    show: false,
    alwaysOnTop: true,
    backgroundColor: "#fefae0",
    autoHideMenuBar: true,
    icon: getAppIcon(),
    webPreferences: {
      contextIsolation: true,
      sandbox: true
    }
  });

  splashWindow.on("closed", () => {
    splashWindow = null;
  });

  const splashHtml = `<!doctype html>
  <html>
    <head>
      <meta charset="utf-8" />
      <title>${APP_NAME}</title>
      <style>
        :root { color-scheme: light; }
        body {
          margin: 0;
          font-family: Arial, sans-serif;
          background: #fefae0;
          color: #283618;
          display: grid;
          place-items: center;
          height: 100vh;
        }
        .wrap {
          display: grid;
          justify-items: center;
          gap: 16px;
        }
        .icon {
          width: 88px;
          height: 110px;
          border: 6px solid #283618;
          border-radius: 10px;
          background: #ffffff;
          position: relative;
          box-sizing: border-box;
        }
        .icon::before {
          content: "";
          position: absolute;
          left: 0;
          top: 0;
          width: 100%;
          height: 24px;
          background: #bc6c25;
          border-radius: 4px 4px 0 0;
        }
        .line {
          width: 54px;
          height: 6px;
          background: #606c38;
          border-radius: 4px;
        }
        .line.l1 { margin-top: 38px; }
        .line.l2 { width: 46px; }
        .line.l3 { width: 40px; }
        .title {
          font-size: 28px;
          font-weight: 700;
          letter-spacing: 0.4px;
        }
        .sub {
          font-size: 14px;
          opacity: 0.9;
        }
      </style>
    </head>
    <body>
      <div class="wrap">
        <div class="icon">
          <div class="line l1"></div>
          <div class="line l2"></div>
          <div class="line l3"></div>
        </div>
        <div class="title">${APP_NAME}</div>
        <div class="sub">Loading forms…</div>
      </div>
    </body>
  </html>`;

  splashWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(splashHtml)}`).finally(() => {
    if (splashWindow && !splashWindow.isDestroyed()) {
      splashWindow.show();
    }
  });
}

function closeSplashWindow() {
  if (!splashWindow || splashWindow.isDestroyed()) {
    return;
  }

  splashWindow.close();
  splashWindow = null;
}

async function startProdServer() {
  if (prodServerHandle) {
    return;
  }

  const runtimeDir = getRuntimeDir();
  const vinextProdServerPath = resolveVinextProdServerPath();
  const outDir = path.join(runtimeDir, "dist");

  if (!vinextProdServerPath) {
    throw new Error("Unable to locate vinext production server module in packaged app resources");
  }

  const vinextServerModule = await import(pathToFileURL(vinextProdServerPath).href);
  const startVinextProdServer = vinextServerModule?.startProdServer;

  if (typeof startVinextProdServer !== "function") {
    throw new Error("Vinext production server module does not export startProdServer");
  }

  // Force production mode to avoid React RSC dev/prod payload mismatches
  // (which can render UI but break interactivity/click handlers).
  process.env.NODE_ENV = "production";

  prodServerHandle = await startVinextProdServer({
    // Use an ephemeral local port to avoid collisions on user machines.
    port: 0,
    host: PROD_HOST,
    outDir
  });

  if (!prodServerHandle || typeof prodServerHandle.close !== "function") {
    throw new Error("Vinext production server did not return a closable server handle");
  }

  const address = prodServerHandle.address?.();
  const activePort = typeof address === "object" && address && typeof address.port === "number"
    ? address.port
    : PROD_PORT;
  prodServerUrl = `http://${PROD_HOST}:${activePort}`;

  prodServerHandle.on?.("error", (error) => {
    console.error("Vinext production server error:", error);
  });
}

async function createMainWindow() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.focus();
    return;
  }

  if (app.isPackaged) {
    await startProdServer();
  }

  mainWindow = new BrowserWindow({
    width: 1500,
    height: 980,
    minWidth: 1100,
    minHeight: 740,
    title: APP_NAME,
    show: false,
    autoHideMenuBar: true,
    icon: getAppIcon(),
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      sandbox: true
    }
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  mainWindow.once("ready-to-show", () => {
    closeSplashWindow();

    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.show();
      mainWindow.setTitle(APP_NAME);
    }
  });

  const targetUrl = app.isPackaged ? prodServerUrl : DEV_URL;

  // Retry URL load to absorb brief server warm-up on slower systems.
  const maxAttempts = 15;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      await mainWindow.loadURL(targetUrl);
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.setTitle(APP_NAME);
      }
      return;
    } catch (error) {
      if (attempt === maxAttempts) {
        throw error;
      }

      await new Promise((resolve) => setTimeout(resolve, 300));
    }
  }
}

function stopServerProcess() {
  if (!prodServerHandle) {
    return;
  }

  try {
    prodServerHandle.close();
  } catch (error) {
    console.error("Failed to close production server handle:", error);
  }

  prodServerHandle = null;
}

if (hasSingleInstanceLock) {
  app.on("second-instance", () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      if (mainWindow.isMinimized()) {
        mainWindow.restore();
      }

      mainWindow.focus();
    }
  });

  app.whenReady().then(async () => {
    let diagnostics = null;

    try {
      if (app.isPackaged) {
        diagnostics = runPackagedSelfCheck();

        if (diagnostics.issues.length > 0) {
          throw new Error(diagnostics.issues.join("\n"));
        }

        ensureWritablePdfDataDir();
      }

      createSplashWindow();
      await createMainWindow();
    } catch (error) {
      console.error("Failed to start Formmaker desktop app:", error);
      closeSplashWindow();
      showStartupErrorDialog(error, diagnostics);
      app.quit();
    }
  });
}

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createMainWindow().catch((error) => {
      console.error("Failed to reactivate main window:", error);
    });
  }
});

app.on("before-quit", () => {
  closeSplashWindow();
  stopServerProcess();
});

app.on("window-all-closed", () => {
  closeSplashWindow();
  stopServerProcess();

  if (process.platform !== "darwin") {
    app.quit();
  }
});
