"use strict";
const electron = require("electron");
const main = require("@electron/remote/main");
const ElectronStore = require("electron-store");
const serialport = require("serialport");
const path = require("path");
process.env["PREBUILDS_ONLY"] = "1";
main.initialize();
ElectronStore.initRenderer();
let mainWindow = null;
function createWindow() {
  mainWindow = new electron.BrowserWindow({
    width: 1280,
    height: 800,
    title: "Power Profiler",
    icon: path.join(__dirname, "../../resources/icon.png"),
    webPreferences: {
      preload: path.join(__dirname, "../preload/preload.js"),
      nodeIntegration: true,
      contextIsolation: false
    }
  });
  mainWindow.removeMenu();
  main.enable(mainWindow.webContents);
  if (process.env["ELECTRON_RENDERER_URL"]) {
    mainWindow.loadURL(process.env["ELECTRON_RENDERER_URL"]);
  } else {
    mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"));
  }
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}
electron.app.whenReady().then(() => {
  createWindow();
  electron.app.on("activate", () => {
    if (electron.BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});
electron.app.on("window-all-closed", () => {
  if (process.platform !== "darwin") electron.app.quit();
});
electron.ipcMain.handle("list-serial-ports", async () => {
  const ports = await serialport.SerialPort.list();
  return ports;
});
electron.ipcMain.on("get-app-dir", (event) => {
  event.returnValue = electron.app.getAppPath();
});
electron.ipcMain.on("get-app-data-dir", (event) => {
  event.returnValue = electron.app.getPath("userData");
});
electron.ipcMain.handle("open-url", async (_, url) => {
  await electron.shell.openExternal(url);
});
electron.ipcMain.handle("show-open-dialog", async (_, options) => {
  return electron.dialog.showOpenDialog(options);
});
electron.ipcMain.handle("show-save-dialog", async (_, options) => {
  return electron.dialog.showSaveDialog(options);
});
let powerSaveBlockerId;
electron.ipcMain.handle("power-save-start", () => {
  if (powerSaveBlockerId === void 0) {
    const { powerSaveBlocker } = require("electron");
    powerSaveBlockerId = powerSaveBlocker.start("prevent-app-suspension");
  }
  return powerSaveBlockerId;
});
electron.ipcMain.handle("power-save-end", (_, id) => {
  const { powerSaveBlocker } = require("electron");
  if (powerSaveBlocker.isStarted(id)) {
    powerSaveBlocker.stop(id);
  }
  powerSaveBlockerId = void 0;
});
