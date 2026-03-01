const { app, BrowserWindow, nativeImage } = require("electron");
const { spawn } = require("node:child_process");
const path = require("node:path");

const APP_NAME = "Formmaker";
const DEV_URL = process.env.VITE_DEV_SERVER_URL || "http://localhost:3417";
const PROD_PORT = 3417;

let mainWindow = null;
let splashWindow = null;
let serverProcess = null;

const hasSingleInstanceLock = app.requestSingleInstanceLock();

if (!hasSingleInstanceLock) {
  app.quit();
}

app.setName(APP_NAME);

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

function waitForServer(url, timeoutMs = 45000) {
  const startedAt = Date.now();

  return new Promise((resolve, reject) => {
    const poll = async () => {
      if (Date.now() - startedAt > timeoutMs) {
        reject(new Error("Timed out waiting for server"));
        return;
      }

      try {
        const response = await fetch(url);

        if (response.ok || response.status < 500) {
          resolve();
          return;
        }
      } catch {
      }

      setTimeout(poll, 350);
    };

    poll();
  });
}

async function startProdServer() {
  if (serverProcess) {
    return;
  }

  const appPath = app.getAppPath();
  const vinextCliPath = path.join(appPath, "node_modules", "vinext", "dist", "cli.js");

  serverProcess = spawn(
    process.execPath,
    [vinextCliPath, "start", "--port", String(PROD_PORT), "--strict-port"],
    {
      cwd: appPath,
      env: {
        ...process.env,
        ELECTRON_RUN_AS_NODE: "1"
      },
      windowsHide: true,
      stdio: "pipe"
    }
  );

  serverProcess.on("exit", () => {
    serverProcess = null;
  });

  await waitForServer(`http://127.0.0.1:${PROD_PORT}`);
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

  const targetUrl = app.isPackaged ? `http://localhost:${PROD_PORT}` : DEV_URL;

  const maxAttempts = app.isPackaged ? 1 : 15;
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
  if (!serverProcess || !serverProcess.pid) {
    return;
  }

  const pid = serverProcess.pid;

  if (process.platform === "win32") {
    spawn("taskkill", ["/pid", String(pid), "/t", "/f"], {
      windowsHide: true,
      stdio: "ignore"
    });
  } else {
    serverProcess.kill();
  }

  serverProcess = null;
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
    try {
      createSplashWindow();
      await createMainWindow();
    } catch (error) {
      console.error("Failed to start Formmaker desktop app:", error);
      closeSplashWindow();
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
