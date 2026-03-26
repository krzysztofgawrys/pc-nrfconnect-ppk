/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { ipcRenderer } from 'electron';

import { close, open } from '../actions/deviceActions';
import { setShowPPK1Dialog } from '../features/DeprecatedDevice/DeprecatedDeviceSlice';
import { deviceOpen as deviceOpenSelector } from '../slices/appSlice';
import { selectDevice, deselectDevice } from '../store/frameworkSlice';
import type { Device } from '../shims/nrfconnect-shared';

interface SerialPortInfo {
    path: string;
    manufacturer?: string;
    serialNumber?: string;
    pnpId?: string;
    locationId?: string;
    vendorId?: string;
    productId?: string;
}

// Nordic Semiconductor USB vendor ID
const NORDIC_VID = '1915';

export default () => {
    const dispatch = useDispatch();
    const deviceOpen = useSelector(deviceOpenSelector);

    const [ports, setPorts] = useState<SerialPortInfo[]>([]);
    const [selectedPort, setSelectedPort] = useState<string>('');
    const [connecting, setConnecting] = useState(false);

    const refreshPorts = async () => {
        const list: SerialPortInfo[] = await ipcRenderer.invoke(
            'list-serial-ports',
        );
        setPorts(list);
    };

    useEffect(() => {
        refreshPorts();
        // Refresh port list every 2 seconds while no device is open
        const interval = setInterval(() => {
            if (!deviceOpen) refreshPorts();
        }, 2000);
        return () => clearInterval(interval);
    }, [deviceOpen]);

    const handleConnect = async () => {
        if (!selectedPort) return;
        setConnecting(true);

        const portInfo = ports.find(p => p.path === selectedPort);
        const isNordic = portInfo?.vendorId === NORDIC_VID;

        const device: Device = {
            serialNumber: selectedPort,
            serialPorts: [{ comName: selectedPort }],
            traits: {
                nordicUsb: isNordic,
                serialPorts: true,
            },
            ...(isNordic && {
                usb: {
                    device: {
                        descriptor: {
                            idProduct: parseInt(portInfo?.productId ?? '0', 16),
                        },
                    },
                },
            }),
        };

        // PPK1 was jlink-based – show deprecation dialog
        if (portInfo?.pnpId?.toLowerCase().includes('jlink')) {
            dispatch(setShowPPK1Dialog(true));
            setConnecting(false);
            return;
        }

        dispatch(selectDevice(device));
        await (dispatch as any)(open(device));
        setConnecting(false);
    };

    const handleDisconnect = async () => {
        await (dispatch as any)(close());
        dispatch(deselectDevice());
        setSelectedPort('');
        refreshPorts();
    };

    if (deviceOpen) {
        return (
            <div className="tw-flex tw-items-center tw-gap-2">
                <span className="tw-text-white tw-text-sm tw-opacity-90">
                    {selectedPort}
                </span>
                <button
                    type="button"
                    onClick={handleDisconnect}
                    className="tw-rounded tw-bg-white/20 tw-px-3 tw-py-1 tw-text-sm tw-text-white hover:tw-bg-white/30 tw-transition-colors"
                >
                    Disconnect
                </button>
            </div>
        );
    }

    return (
        <div className="tw-flex tw-items-center tw-gap-2">
            <select
                value={selectedPort}
                onChange={e => setSelectedPort(e.target.value)}
                disabled={connecting}
                className="tw-rounded tw-border-0 tw-bg-white/90 tw-px-2 tw-py-1 tw-text-sm tw-text-gray-800 focus:tw-outline-none disabled:tw-opacity-50 tw-min-w-[180px]"
            >
                <option value="">Select serial port…</option>
                {ports.map(p => (
                    <option key={p.path} value={p.path}>
                        {p.path}
                        {p.manufacturer ? ` (${p.manufacturer})` : ''}
                    </option>
                ))}
            </select>

            <button
                type="button"
                onClick={handleConnect}
                disabled={!selectedPort || connecting}
                className="tw-rounded tw-bg-white/20 tw-px-3 tw-py-1 tw-text-sm tw-text-white hover:tw-bg-white/30 tw-transition-colors disabled:tw-opacity-50 disabled:tw-pointer-events-none"
            >
                {connecting ? 'Connecting…' : 'Connect'}
            </button>

            <button
                type="button"
                onClick={refreshPorts}
                title="Refresh port list"
                className="tw-rounded tw-bg-white/20 tw-px-2 tw-py-1 tw-text-sm tw-text-white hover:tw-bg-white/30 tw-transition-colors"
            >
                ↺
            </button>
        </div>
    );
};
