/*
 * Standalone equivalents of the framework slices that nRF Connect for Desktop
 * normally provides via @nordicsemiconductor/pc-nrfconnect-shared.
 */

import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

import type { Device } from '../shims/nrfconnect-shared';

// ─── Device slice ─────────────────────────────────────────────────────────────

interface DeviceState {
    selectedDevice: Device | null;
}

const deviceSlice = createSlice({
    name: 'device',
    initialState: { selectedDevice: null } as DeviceState,
    reducers: {
        selectDevice(state, action: PayloadAction<Device | null>) {
            state.selectedDevice = action.payload;
        },
        deselectDevice(state) {
            state.selectedDevice = null;
        },
    },
});

export const { selectDevice, deselectDevice } = deviceSlice.actions;
export const deviceReducer = deviceSlice.reducer;

// ─── Pane slice ───────────────────────────────────────────────────────────────

interface PaneState {
    currentPane: string;
}

const paneSlice = createSlice({
    name: 'pane',
    initialState: { currentPane: 'Data Logger' } as PaneState,
    reducers: {
        setCurrentPane(state, action: PayloadAction<string>) {
            state.currentPane = action.payload;
        },
    },
});

export const { setCurrentPane } = paneSlice.actions;
export const paneReducer = paneSlice.reducer;

// ─── Confirm-before-close slice ───────────────────────────────────────────────

interface ConfirmState {
    messages: Record<string, string>;
}

const confirmSlice = createSlice({
    name: 'confirm',
    initialState: { messages: {} } as ConfirmState,
    reducers: {
        addConfirmBeforeClose(
            state,
            action: PayloadAction<{ id: string; message: string }>,
        ) {
            state.messages[action.payload.id] = action.payload.message;
        },
        clearConfirmBeforeClose(state, action: PayloadAction<string>) {
            delete state.messages[action.payload];
        },
    },
});

export const { addConfirmBeforeClose, clearConfirmBeforeClose } =
    confirmSlice.actions;
export const confirmReducer = confirmSlice.reducer;
