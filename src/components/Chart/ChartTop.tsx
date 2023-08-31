/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import React, { MutableRefObject } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
    Button,
    Dialog,
    InfoDialog,
    Toggle,
} from '@nordicsemiconductor/pc-nrfconnect-shared';
import { BigNumber, Fraction, unit } from 'mathjs';

import {
    chartState,
    resetChart,
    setShowSettings,
    showChartSettings,
    toggleYAxisLock,
    toggleYAxisLog,
} from '../../slices/chartSlice';
import { dataLoggerState } from '../../slices/dataLoggerSlice';
import { isDataLoggerPane as isDataLoggerPaneSelector } from '../../utils/panes';
import { AmpereChartJS } from './AmpereChart';
import ChartOptions from './ChartOptions';

type TimeWindowButton = {
    label: string;
    zoomToWindow: (duration: number | BigNumber | Fraction) => void;
};
const TimeWindowButton = ({ label, zoomToWindow }: TimeWindowButton) => (
    <Button
        className="tw-h-5 tw-w-12 tw-border-gray-200 tw-text-gray-700 hover:tw-bg-gray-50 lg:tw-w-16"
        variant="secondary"
        onClick={() => zoomToWindow(unit(label).to('us').toNumeric())}
    >
        {label}
    </Button>
);

type ChartTop = {
    chartPause: () => void;
    zoomToWindow: (windowDuration: number | BigNumber | Fraction) => void;
    chartRef: MutableRefObject<AmpereChartJS | null>;
    windowDuration: number;
};

const ChartTop = ({
    chartPause,
    zoomToWindow,
    chartRef,
    windowDuration,
}: ChartTop) => {
    const dispatch = useDispatch();
    const { windowBegin, windowEnd } = useSelector(chartState);
    const { maxFreqLog10, sampleFreqLog10 } = useSelector(dataLoggerState);
    const isDataLoggerPane = useSelector(isDataLoggerPaneSelector);
    const live = windowBegin === 0 && windowEnd === 0;

    const timeWindowLabels = [
        '10ms',
        '100ms',
        '1s',
        '3s',
        '10s',
        '1min',
        '10min',
        '1h',
        '6h',
        '1day',
        '1week',
    ].slice(maxFreqLog10 - sampleFreqLog10, maxFreqLog10 - sampleFreqLog10 + 6);

    return (
        <div className="tw-flex tw-w-full tw-flex-row tw-flex-wrap tw-justify-between tw-py-2 tw-pl-[4.3rem] tw-pr-[1.8rem]">
            <div className="tw-flex tw-h-full tw-w-1/4 tw-items-center tw-gap-x-4">
                <button
                    className="tw-flex tw-h-5 tw-min-w-[4rem] tw-flex-row tw-gap-x-2 tw-border-none tw-bg-white tw-text-gray-700 hover:tw-bg-gray-50"
                    type="button"
                    onClick={() => dispatch(setShowSettings(true))}
                >
                    <span className="mdi mdi-cog" /> <p>SETTINGS</p>
                </button>
            </div>
            {isDataLoggerPane && (
                <div className="tw-flex tw-w-2/4 tw-flex-row tw-justify-center tw-gap-x-2 tw-place-self-start lg:tw-place-self-auto">
                    {timeWindowLabels.map(label => (
                        <TimeWindowButton
                            label={label}
                            key={label}
                            zoomToWindow={zoomToWindow}
                        />
                    ))}
                </div>
            )}
            {isDataLoggerPane && (
                <div className="tw-flex tw-w-1/4 tw-flex-row tw-justify-end">
                    <Toggle
                        label="LIVE VIEW"
                        onToggle={() => {
                            live ? chartPause() : dispatch(resetChart());
                        }}
                        isToggled={live}
                        variant="primary"
                    />
                </div>
            )}
            <ChartSettingsDialog
                zoomToWindow={zoomToWindow}
                chartRef={chartRef}
                windowDuration={windowDuration}
            />
        </div>
    );
};

const ChartSettingsDialog = ({
    zoomToWindow,
    chartRef,
    windowDuration,
}: {
    zoomToWindow: (windowDuration: number | BigNumber | Fraction) => void;
    chartRef: MutableRefObject<AmpereChartJS | null>;
    windowDuration: number;
}) => {
    const dispatch = useDispatch();
    const showSettings = useSelector(showChartSettings);
    const { yAxisLock, yAxisLog } = useSelector(chartState);

    return (
        <InfoDialog
            title="Chart Settings"
            headerIcon="cog"
            isVisible={showSettings}
            onHide={() => dispatch(setShowSettings(false))}
        >
            <Dialog.Body>
                <div className="tw-w-1/3 tw-py-2">
                    <Toggle
                        title="Enable in order to make the scale on the y-axis logarithmic"
                        label="Logarithmic Y-axis"
                        onToggle={() => {
                            dispatch(toggleYAxisLog());
                        }}
                        isToggled={yAxisLog}
                        variant="primary"
                    />
                </div>
                <div>
                    <div className="tw-w-1/3 tw-py-2">
                        <Toggle
                            title="Enable in order to explicitly set the start and end of the y-axis"
                            label="Lock Y-axis"
                            onToggle={() => {
                                if (yAxisLock) {
                                    dispatch(
                                        toggleYAxisLock({
                                            yMin: null,
                                            yMax: null,
                                        })
                                    );
                                    zoomToWindow(windowDuration);
                                } else {
                                    const { min: yMin, max: yMax } = chartRef
                                        .current?.scales?.yScale ?? {
                                        min: null,
                                        max: null,
                                    };
                                    dispatch(toggleYAxisLock({ yMin, yMax }));
                                }
                            }}
                            isToggled={yAxisLock}
                            variant="primary"
                        />
                    </div>
                    <ChartOptions />
                </div>
            </Dialog.Body>
        </InfoDialog>
    );
};

export default ChartTop;
