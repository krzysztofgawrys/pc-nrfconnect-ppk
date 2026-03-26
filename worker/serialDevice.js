/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

// Resolve serialport from the local node_modules (standalone app).
// In production the native .node addon must be in app.asar.unpacked,
// which electron-builder handles via the asarUnpack option.
const { SerialPort } = (() => {
    try {
        return require('serialport');
    } catch (_e) {
        const path = require('path');
        const unpackedPath = path.join(
            process.resourcesPath,
            'app.asar.unpacked',
            'node_modules',
            'serialport',
        );
        return require(unpackedPath);
    }
})();

let port = null;
process.on('message', msg => {
    if (msg.open) {
        console.log('\x1b[2J'); // ansi clear screen
        process.send({ opening: msg.open });
        port = new SerialPort({
            path: msg.open,
            autoOpen: false,
            baudRate: 115200,
        });

        let data = Buffer.alloc(0);
        port.on('data', buf => {
            data = Buffer.concat([data, buf]);
        });
        setInterval(() => {
            if (data.length === 0) return;
            process.send(data.slice(), err => {
                if (err) console.log(err);
            });
            data = Buffer.alloc(0);
        }, 30);
        port.open(err => {
            if (err) {
                process.send({ error: err.toString() });
            }
            process.send({ started: msg.open });
        });
    }
    if (msg.write) {
        port.write(msg.write, err => {
            if (err) {
                process.send({ error: 'PPK command failed' });
            }
        });
    }
});

process.on('disconnect', () => {
    console.log('parent process disconnected, cleaning up');
    if (port) {
        port.close(process.exit);
    } else {
        process.exit();
    }
});
