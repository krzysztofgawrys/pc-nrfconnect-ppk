/*
 * Standalone Redux store combining framework slices with app reducers.
 */

import { configureStore } from '@reduxjs/toolkit';

import appReducer from '../slices';
import {
    confirmReducer,
    deviceReducer,
    paneReducer,
} from './frameworkSlice';

const store = configureStore({
    reducer: {
        app: appReducer,
        device: deviceReducer,
        pane: paneReducer,
        confirm: confirmReducer,
    },
    middleware: getDefaultMiddleware =>
        getDefaultMiddleware({
            // FileBuffer and other globals contain non-serialisable data;
            // suppress the serialisability check to avoid console noise.
            serializableCheck: false,
        }),
});

export type StoreType = typeof store;
export type AppDispatch = typeof store.dispatch;
export default store;
