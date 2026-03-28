import { builtinModules, createRequire } from 'module';
import path from 'path';

import react from '@vitejs/plugin-react';
import autoprefixer from 'autoprefixer';
import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import tailwindcss from 'tailwindcss';
import type { Plugin } from 'vite';

// In build mode: mark Node built-ins + 'electron' as Rollup externals so
// the output keeps require() calls (works with nodeIntegration: true).
// In dev mode: serve virtual modules whose bodies use require() — Electron's
// renderer process (nodeIntegration: true) resolves them at runtime.
// Electron renderer-side named exports (require('electron') inside Electron
// returns these, but the 'electron' npm stub has none — so we hard-code them).
const ELECTRON_RENDERER_EXPORTS = [
    'ipcRenderer',
    'webFrame',
    'contextBridge',
    'clipboard',
    'nativeImage',
    'shell',
    'desktopCapturer',
    'crashReporter',
];

// @electron/remote exports available in the renderer process.
const ELECTRON_REMOTE_EXPORTS = [
    'getBuiltin',
    'getCurrentWindow',
    'getCurrentWebContents',
    'getGlobal',
    'createFunctionWithReturnValue',
    // Electron built-in modules exposed through remote
    'app',
    'BrowserWindow',
    'dialog',
    'Menu',
    'MenuItem',
    'shell',
    'Tray',
    'screen',
    'clipboard',
    'nativeImage',
    'powerMonitor',
    'systemPreferences',
    'desktopCapturer',
    'crashReporter',
    'webContents',
];

// Packages whose exports cannot be introspected from Vite's Node.js context
// (they need a live Electron process). Map: module id → export name list.
const HARDCODED_EXPORTS: Record<string, string[]> = {
    'electron': ELECTRON_RENDERER_EXPORTS,
    '@electron/remote': ELECTRON_REMOTE_EXPORTS,
};

// Pure Node.js npm packages that should never be pre-bundled by esbuild.
// They use native require() at runtime in the Electron renderer process.
const NODE_ONLY_PACKAGES = [
    'electron-log',
    'electron-log/renderer',
    'electron-store',
    '@electron/remote',
    'fs-extra',
    'graceful-fs',
    'archiver',
    'unzipper',
    'serialport',
    '@serialport/bindings-cpp',
];

function nodeBuiltinsExternalPlugin(): Plugin {
    const _require = createRequire(import.meta.url);
    const external = new Set([...builtinModules, 'electron', ...NODE_ONLY_PACKAGES]);
    const VIRT = '\0node-builtin:';

    return {
        name: 'node-builtins-external',
        enforce: 'pre',
        resolveId(id) {
            // Always redirect to a virtual module that uses require() at runtime.
            // Using Rollup's external:true would produce static ESM import statements
            // (e.g. import { ipcRenderer } from "electron") which Chromium's module
            // loader can't resolve. Instead, the virtual module emits require() calls
            // which work in Electron renderer with nodeIntegration:true.
            const bare = id.startsWith('node:') ? id.slice(5) : id;
            if (external.has(id) || external.has(bare)) {
                return VIRT + bare;
            }
            // Match sub-path imports, e.g. 'electron-log/renderer'
            for (const pkg of external) {
                if (id.startsWith(pkg + '/')) {
                    return VIRT + id;
                }
            }
        },
        load(id) {
            if (!id.startsWith(VIRT)) return;
            const mod = id.slice(VIRT.length);

            // For packages that need a live Electron process, use hardcoded list.
            let keys: string[];
            if (HARDCODED_EXPORTS[mod]) {
                keys = HARDCODED_EXPORTS[mod];
            } else {
                keys = [];
                try {
                    keys = Object.keys(_require(mod)).filter(
                        k =>
                            k !== 'default' &&
                            /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(k),
                    );
                } catch {
                    /* ignore */
                }
            }

            const named = keys
                .map(k => `export const ${k} = _m.${k};`)
                .join('\n');
            return `const _m = require(${JSON.stringify(mod)});\nexport default _m;\n${named}`;
        },
    };
}

export default defineConfig({
    main: {
        plugins: [externalizeDepsPlugin()],
        build: {
            lib: {
                entry: path.resolve(__dirname, 'electron/index.ts'),
            },
        },
    },
    preload: {
        plugins: [externalizeDepsPlugin()],
        build: {
            lib: {
                entry: path.resolve(__dirname, 'electron/preload.ts'),
            },
        },
    },
    renderer: {
        root: '.',
        build: {
            rollupOptions: {
                input: path.resolve(__dirname, 'index.html'),
            },
        },
        optimizeDeps: {
            exclude: [...builtinModules, 'electron', ...NODE_ONLY_PACKAGES],
        },
        plugins: [nodeBuiltinsExternalPlugin(), react()],
        resolve: {
            alias: {
                // Sub-path aliases must come BEFORE the package-level alias
                '@nordicsemiconductor/pc-nrfconnect-shared/src/logging/describeError':
                    path.resolve(
                        __dirname,
                        'src/shims/nrfconnect-shared-describeError.ts',
                    ),
                '@nordicsemiconductor/pc-nrfconnect-shared/src/logging':
                    path.resolve(
                        __dirname,
                        'src/shims/nrfconnect-shared-logging.ts',
                    ),
                '@nordicsemiconductor/pc-nrfconnect-shared/nrfutil/device/common':
                    path.resolve(
                        __dirname,
                        'src/shims/nrfconnect-shared-device-common.ts',
                    ),
                '@nordicsemiconductor/pc-nrfconnect-shared/test':
                    path.resolve(
                        __dirname,
                        'src/shims/nrfconnect-shared-test.ts',
                    ),
                '@nordicsemiconductor/pc-nrfconnect-shared': path.resolve(
                    __dirname,
                    'src/shims/nrfconnect-shared.ts',
                ),
            },
        },
        css: {
            postcss: {
                plugins: [tailwindcss, autoprefixer],
            },
        },
    },
});
