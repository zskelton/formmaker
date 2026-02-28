const { app, BrowserWindow } = require("electron");
const { spawn } = require("node:child_process");
const path = require("node:path");

const DEV_URL = process.env.VITE_DEV_SERVER_URL || "http://localhost:3417";
const PROD_PORT = 3417;

let mainWindow = null;
let serverProcess = null;

const hasSingleInstanceLock = app.requestSingleInstanceLock();

if (!hasSingleInstanceLock) {
  app.quit();
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
    [vinextCliPath, "start", "--port", String(PROD_PORT), "--strictPort"],
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
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      sandbox: true
    }
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  const targetUrl = app.isPackaged ? `http://localhost:${PROD_PORT}` : DEV_URL;

  const maxAttempts = app.isPackaged ? 1 : 15;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      await mainWindow.loadURL(targetUrl);
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
      await createMainWindow();
    } catch (error) {
      console.error("Failed to start Formmaker desktop app:", error);
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
  stopServerProcess();
});

app.on("window-all-closed", () => {
  stopServerProcess();

  if (process.platform !== "darwin") {
    app.quit();
  }
});
