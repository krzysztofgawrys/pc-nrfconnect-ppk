/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import React, { useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider, useDispatch, useSelector } from 'react-redux';

import Chart from './components/Chart/Chart';
import DeviceSelector from './components/DeviceSelector';
import SidePanel from './components/SidePanel/SidePanel';
import RecoveryDialogs from './features/recovery/RecoveryDialogs';
import { updateTitle } from './globals';
import store from './store/store';
import { getFileLoaded, isSavePending } from './slices/appSlice';
import { getRecordingMode } from './slices/chartSlice';
import { useGlobalHotkeys } from './utils/globalHotkeys';
import { isDataLoggerPane, isScopePane, Panes } from './utils/panes';
import { setCurrentPane } from './store/frameworkSlice';
import { selectedDevice } from './shims/nrfconnect-shared';

import './index.scss';

const GlobalHotkeysProvider = () => {
    useGlobalHotkeys();
    return null;
};

const AppTitleHook = () => {
    const device = useSelector(selectedDevice);
    const fileName = useSelector(getFileLoaded);
    const pendingSave = useSelector(isSavePending);

    useEffect(() => {
        if (fileName) {
            updateTitle(fileName);
            return;
        }

        let title = '';
        if (device?.serialNumber) {
            title += device.serialNumber;
        }

        if (pendingSave) {
            title += ' - Unsaved data*';
        }

        updateTitle(title);
    }, [device, fileName, pendingSave]);

    return null;
};

const ChartWrapper: React.FC<{ active: boolean }> = ({ active }) => {
    const currentMode = useSelector(getRecordingMode);
    const dataLoggerPane = useSelector(isDataLoggerPane);
    const scopePane = useSelector(isScopePane);
    const paneName = currentMode === 'DataLogger' ? 'Data Logger' : 'Scope';

    if (
        (currentMode === 'DataLogger' && !dataLoggerPane) ||
        (currentMode === 'Scope' && !scopePane)
    )
        return (
            <div className="tw-flex tw-h-full tw-items-center tw-justify-center">
                <div>
                    Currently the device is running in {paneName} mode. Switch
                    to the <span className="tw-uppercase">{paneName}</span> tab
                    to see the results.
                </div>
            </div>
        );

    return active ? <Chart /> : null;
};

const PaneTabs = () => {
    const dispatch = useDispatch();
    const dataLoggerPane = useSelector(isDataLoggerPane);
    const scopePane = useSelector(isScopePane);

    const panes = [
        { name: Panes.DATA_LOGGER, active: dataLoggerPane },
        { name: Panes.SCOPE, active: scopePane },
    ];

    return (
        <div className="tw-flex tw-gap-1">
            {panes.map(({ name, active }) => (
                <button
                    key={name}
                    type="button"
                    onClick={() => dispatch(setCurrentPane(name))}
                    className={`tw-px-4 tw-py-1.5 tw-text-sm tw-font-medium tw-rounded-t tw-transition-colors ${
                        active
                            ? 'tw-bg-white tw-text-[#0069C2] tw-border-b-0 tw-border tw-border-gray-200'
                            : 'tw-bg-gray-100 tw-text-gray-600 hover:tw-bg-gray-200'
                    }`}
                >
                    {name}
                </button>
            ))}
        </div>
    );
};

const AppLayout = () => (
    <div className="tw-flex tw-h-screen tw-flex-col tw-bg-white tw-text-gray-900 tw-overflow-hidden">
        {/* Top bar */}
        <div className="tw-flex tw-items-center tw-gap-4 tw-bg-[#0069C2] tw-px-4 tw-py-2 tw-shrink-0">
            <span className="tw-text-white tw-font-semibold tw-text-sm tw-whitespace-nowrap">
                Power Profiler
            </span>
            <DeviceSelector />
        </div>

        {/* Pane tabs + content */}
        <div className="tw-flex tw-flex-1 tw-overflow-hidden tw-flex-col">
            <div className="tw-flex tw-items-end tw-px-4 tw-pt-2 tw-bg-gray-50 tw-border-b tw-border-gray-200">
                <PaneTabs />
            </div>

            <div className="tw-flex tw-flex-1 tw-overflow-hidden">
                {/* Main chart area */}
                <div className="tw-flex-1 tw-overflow-hidden">
                    <ChartWrapper active />
                </div>

                {/* Side panel */}
                <SidePanel />
            </div>
        </div>

        <GlobalHotkeysProvider />
        <RecoveryDialogs />
        <AppTitleHook />
    </div>
);

const root = createRoot(document.getElementById('app')!);
root.render(
    <Provider store={store}>
        <AppLayout />
    </Provider>,
);
