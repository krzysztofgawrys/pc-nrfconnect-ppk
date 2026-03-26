/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import { app, BrowserWindow, dialog, ipcMain, Menu, shell } from 'electron';
import { initialize, enable } from '@electron/remote/main';
import ElectronStore from 'electron-store';
import { SerialPort } from 'serialport';
import path from 'path';

initialize();
ElectronStore.initRenderer();

let mainWindow: BrowserWindow | null = null;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1280,
        height: 800,
        title: 'Power Profiler',
        icon: path.join(__dirname, '../../resources/icon.png'),
        webPreferences: {
            preload: path.join(__dirname, '../preload/preload.js'),
            nodeIntegration: true,
            contextIsolation: false,
        },
    });

    mainWindow.removeMenu();

    enable(mainWindow.webContents);

    if (process.env['ELECTRON_RENDERER_URL']) {
        mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL']);
    } else {
        mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
    }

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

// IPC handlers

ipcMain.handle('list-serial-ports', async () => {
    const ports = await SerialPort.list();
    return ports;
});

ipcMain.on('get-app-dir', event => {
    event.returnValue = app.getAppPath();
});

ipcMain.on('get-app-data-dir', event => {
    event.returnValue = app.getPath('userData');
});

ipcMain.handle('open-url', async (_, url: string) => {
    await shell.openExternal(url);
});

ipcMain.handle('show-open-dialog', async (_, options) => {
    return dialog.showOpenDialog(options);
});

ipcMain.handle('show-save-dialog', async (_, options) => {
    return dialog.showSaveDialog(options);
});

let powerSaveBlockerId: number | undefined;

ipcMain.handle('power-save-start', () => {
    if (powerSaveBlockerId === undefined) {
        // Inline require to avoid top-level import issue with electron built-ins
        const { powerSaveBlocker } = require('electron');
        powerSaveBlockerId = powerSaveBlocker.start('prevent-app-suspension');
    }
    return powerSaveBlockerId;
});

ipcMain.handle('power-save-end', (_, id: number) => {
    const { powerSaveBlocker } = require('electron');
    if (powerSaveBlocker.isStarted(id)) {
        powerSaveBlocker.stop(id);
    }
    powerSaveBlockerId = undefined;
});
