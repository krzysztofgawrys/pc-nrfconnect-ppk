/*
 * Shim for @nordicsemiconductor/pc-nrfconnect-shared
 * Replaces the nRF Connect for Desktop framework layer with standalone
 * Electron equivalents.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import React, {
    type ComponentType,
    type FC,
    type ReactNode,
    useEffect,
    useRef,
    useState,
} from 'react';
import { type AnyAction, type ThunkAction } from '@reduxjs/toolkit';
import clsx from 'clsx';
import electronLog from 'electron-log/renderer';
import { ipcRenderer } from 'electron';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface DeviceTraits {
    nordicUsb?: boolean;
    jlink?: boolean;
    serialPort?: boolean;
    serialPorts?: boolean;
    nordicDfu?: boolean;
}

export interface Device {
    serialNumber: string;
    serialPorts?: { comName: string }[];
    traits: DeviceTraits;
    usb?: { device: { descriptor: { idProduct: number } } };
}

// NrfConnectState wraps the app reducer state with framework slices.
// The standalone store adds: device, pane, confirm slices.
export type NrfConnectState<T> = {
    app: T;
    device: { selectedDevice: Device | null };
    pane: { currentPane: string };
    confirm: { messages: Record<string, string> };
};

export type AppThunk<State = any, Return = void> = ThunkAction<
    Return,
    State,
    unknown,
    AnyAction
>;

export type AppDispatch = (action: any) => any;

// DocumentationSection is used both as JSX component and as a type
// eslint-disable-next-line prefer-const
export let DocumentationSection: FC<{
    linkLabel?: string;
    link?: string;
    children?: ReactNode;
}> = ({ linkLabel, link, children }) =>
    React.createElement(
        'div',
        { className: 'tw-p-2 tw-text-sm' },
        children,
        link &&
            // ExternalLink is defined later; use a simple anchor here to avoid circular ref
            React.createElement(
                'a',
                {
                    href: '#',
                    onClick: (e: React.MouseEvent) => {
                        e.preventDefault();
                        // ipcRenderer available at runtime
                        const { ipcRenderer: ipc } = require('electron') as typeof import('electron');
                        ipc.invoke('open-url', link);
                    },
                    className: 'tw-text-[#0069C2] hover:tw-underline',
                },
                linkLabel ?? link,
            ),
    );

export interface DropdownItem<T = string> {
    label: string;
    value: T;
}

// ─── Logger ──────────────────────────────────────────────────────────────────

export const logger = {
    info: (msg: unknown, ...args: unknown[]) =>
        electronLog.info(msg, ...args),
    warn: (msg: unknown, ...args: unknown[]) =>
        electronLog.warn(msg, ...args),
    error: (msg: unknown, ...args: unknown[]) =>
        electronLog.error(msg, ...args),
    debug: (msg: unknown, ...args: unknown[]) =>
        electronLog.debug(msg, ...args),
};

// ─── Telemetry (no-op) ───────────────────────────────────────────────────────

export const telemetry = {
    enableTelemetry: (..._args: unknown[]) => {},
    sendEvent: (..._args: unknown[]) => {},
    sendMetricEvent: (..._args: unknown[]) => {},
    sendPageViewEvent: (..._args: unknown[]) => {},
};

// ─── preventSleep ────────────────────────────────────────────────────────────

export const preventSleep = {
    start: (): Promise<number> => ipcRenderer.invoke('power-save-start'),
    end: (id: number): void => {
        ipcRenderer.invoke('power-save-end', id);
    },
};

// ─── App directory helpers ───────────────────────────────────────────────────

export const getAppDir = (): string =>
    ipcRenderer.sendSync('get-app-dir') as string;

export const getAppDataDir = (): string =>
    ipcRenderer.sendSync('get-app-data-dir') as string;

export const getAppFile = (relativePath: string): string => {
    const path = require('path') as typeof import('path');
    return path.join(getAppDir(), relativePath);
};

// ─── Persistent store ────────────────────────────────────────────────────────

export function getPersistentStore<T extends Record<string, any>>(options?: {
    migrations?: Record<string, (store: any) => void>;
}) {
    // electron-store is CJS; require at runtime to avoid Vite ESM issues
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Store = require('electron-store') as typeof import('electron-store');
    const store = new (Store as any)({
        migrations: options?.migrations ?? {},
    });
    return {
        // Accept both schema-typed keys and arbitrary string keys
        get: <K extends keyof T | string>(
            key: K,
            defaultValue?: K extends keyof T ? T[K] : any,
        ): K extends keyof T ? T[K] : any =>
            store.get(key as string, defaultValue),
        set: <K extends keyof T | string>(
            key: K,
            value: K extends keyof T ? T[K] : any,
        ): void => store.set(key as string, value),
        delete: <K extends keyof T | string>(key: K): void =>
            store.delete(key as string),
    };
}

// ─── Redux selectors / actions (need matching store slices) ──────────────────

export const selectedDevice = (state: NrfConnectState<any>): Device | null =>
    state.device.selectedDevice;

export const currentPane = (state: NrfConnectState<any>): string =>
    state.pane.currentPane;

// These are action creators – the real implementations live in the store slices
// imported by the standalone store. We re-export them from there.
// For files that import them directly from the shim we forward to the slices.
import {
    setCurrentPane as _setCurrentPane,
    addConfirmBeforeClose as _addConfirmBeforeClose,
    clearConfirmBeforeClose as _clearConfirmBeforeClose,
} from '../store/frameworkSlice';

export const setCurrentPane = _setCurrentPane;
export const addConfirmBeforeClose = _addConfirmBeforeClose;
export const clearConfirmBeforeClose = _clearConfirmBeforeClose;

// ─── Colors ──────────────────────────────────────────────────────────────────

export const colors = {
    nordicBlue: '#0069C2',
    primary: '#0069C2',
    white: '#FFFFFF',
    gray50: '#F9FAFB',
    gray100: '#F3F4F6',
    gray700: '#374151',
};

// ─── classNames ──────────────────────────────────────────────────────────────

export { default as classNames } from 'clsx';

// ─── useHotKey ───────────────────────────────────────────────────────────────

export function useHotKey({
    hotKey,
    action,
}: {
    hotKey: string;
    title?: string;
    isGlobal?: boolean;
    action: () => void;
}): void {
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            const parts = hotKey.toLowerCase().split('+');
            const key = parts[parts.length - 1];
            const needsAlt = parts.includes('alt');
            const needsCtrl = parts.includes('ctrl') || parts.includes('control');
            const needsShift = parts.includes('shift');
            const needsMeta = parts.includes('meta') || parts.includes('cmd');

            if (
                e.key.toLowerCase() === key &&
                e.altKey === needsAlt &&
                e.ctrlKey === needsCtrl &&
                e.shiftKey === needsShift &&
                e.metaKey === needsMeta
            ) {
                e.preventDefault();
                action();
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [hotKey, action]);
}

// ─── useStopwatch ─────────────────────────────────────────────────────────────

export function useStopwatch({
    autoStart = false,
    resolution = 1000,
}: {
    autoStart?: boolean;
    resolution?: number;
} = {}): {
    time: number;
    reset: () => void;
    pause: () => void;
    start: (startTime?: number) => void;
    isRunning: boolean;
} {
    const [time, setTime] = useState(0);
    const [isRunning, setIsRunning] = useState(autoStart);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const startTimeRef = useRef<number>(Date.now());
    const accumulatedRef = useRef<number>(0);

    useEffect(() => {
        if (isRunning) {
            startTimeRef.current = Date.now();
            intervalRef.current = setInterval(() => {
                setTime(
                    accumulatedRef.current + (Date.now() - startTimeRef.current),
                );
            }, resolution);
        } else if (intervalRef.current) {
            clearInterval(intervalRef.current);
        }
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [isRunning, resolution]);

    return {
        time,
        isRunning,
        start: (_startTime?: number) => {
            startTimeRef.current = Date.now();
            setIsRunning(true);
        },
        pause: () => {
            accumulatedRef.current += Date.now() - startTimeRef.current;
            setIsRunning(false);
        },
        reset: () => {
            accumulatedRef.current = 0;
            setTime(0);
            if (isRunning) startTimeRef.current = Date.now();
        },
    };
}

// ─── openUrl ─────────────────────────────────────────────────────────────────

export const openUrl = (url: string): void => {
    ipcRenderer.invoke('open-url', url);
};

// ─── render / App (stubs – not used in standalone renderer) ──────────────────

export const render = (_node: ReactNode): void => {
    console.warn('render() from shared shim called – use src/renderer.tsx instead');
};

export const App: FC<{
    appReducer?: any;
    deviceSelect?: ReactNode;
    sidePanel?: ReactNode;
    documentation?: any;
    panes?: any[];
    children?: ReactNode;
}> = ({ children }) => React.createElement(React.Fragment, null, children);

// ─── UI Components ───────────────────────────────────────────────────────────

// Button
interface ButtonProps {
    onClick?: () => void;
    disabled?: boolean;
    variant?: 'primary' | 'secondary' | 'danger' | 'link';
    className?: string;
    children?: ReactNode;
    title?: string;
}
export const Button: FC<ButtonProps> = ({
    onClick,
    disabled,
    variant = 'secondary',
    className,
    children,
    title,
}) => {
    const base =
        'tw-inline-flex tw-items-center tw-justify-center tw-rounded tw-px-3 tw-py-1.5 tw-text-sm tw-font-medium tw-transition-colors focus:tw-outline-none disabled:tw-opacity-50 disabled:tw-pointer-events-none';
    const variants: Record<string, string> = {
        primary: 'tw-bg-[#0069C2] tw-text-white hover:tw-bg-[#0058a3]',
        secondary:
            'tw-bg-transparent tw-border tw-border-gray-300 tw-text-gray-700 hover:tw-bg-gray-100',
        danger: 'tw-bg-red-600 tw-text-white hover:tw-bg-red-700',
        link: 'tw-bg-transparent tw-text-[#0069C2] hover:tw-underline tw-p-0',
    };
    return React.createElement(
        'button',
        {
            type: 'button',
            onClick,
            disabled,
            title,
            className: clsx(base, variants[variant], className),
        },
        children,
    );
};

// ExternalLink
export const ExternalLink: FC<{ href: string; label: string; className?: string }> = ({
    href,
    label,
    className,
}) =>
    React.createElement(
        'a',
        {
            href: '#',
            onClick: (e: React.MouseEvent) => {
                e.preventDefault();
                openUrl(href);
            },
            className: clsx(
                'tw-text-[#0069C2] hover:tw-underline tw-cursor-pointer',
                className,
            ),
        },
        label,
    );

// Group
export const Group: FC<{
    heading?: string;
    children?: ReactNode;
    className?: string;
    gap?: number;
    collapsible?: boolean;
    defaultCollapsed?: boolean;
    collapseStatePersistenceId?: string;
    title?: string; // accepted but ignored
}> = ({ heading, children, className, collapsible, defaultCollapsed }) => {
    const [collapsed, setCollapsed] = useState(defaultCollapsed ?? false);
    return React.createElement(
        'div',
        { className: clsx('tw-flex tw-flex-col tw-gap-2 tw-py-2', className) },
        heading &&
            React.createElement(
                'button',
                {
                    type: 'button',
                    className:
                        'tw-flex tw-items-center tw-gap-1 tw-text-xs tw-font-semibold tw-uppercase tw-text-gray-500 tw-tracking-wide tw-mb-1 tw-w-full tw-text-left',
                    onClick: collapsible
                        ? () => setCollapsed(c => !c)
                        : undefined,
                },
                collapsible &&
                    React.createElement(
                        'span',
                        { className: 'tw-text-gray-400' },
                        collapsed ? '▶' : '▼',
                    ),
                heading,
            ),
        !collapsed && children,
    );
};

// Spinner
export const Spinner: FC<{ className?: string; size?: 'sm' | 'md' | 'lg' }> = ({
    className,
    size = 'md',
}) => {
    const sizeClass =
        size === 'sm'
            ? 'tw-h-3 tw-w-3'
            : size === 'lg'
              ? 'tw-h-6 tw-w-6'
              : 'tw-h-4 tw-w-4';
    return React.createElement('div', {
        className: clsx(
            'tw-inline-block tw-animate-spin tw-rounded-full tw-border-2 tw-border-solid tw-border-current tw-border-r-transparent',
            sizeClass,
            className,
        ),
        role: 'status',
    });
};

// Toggle
interface ToggleProps {
    isToggled: boolean;
    onToggle: (value: boolean) => void;
    label?: string;
    disabled?: boolean;
    className?: string;
    title?: string;
    variant?: string; // accepted but ignored
    children?: ReactNode; // accepted but ignored
}
export const Toggle: FC<ToggleProps> = ({
    isToggled,
    onToggle,
    label,
    disabled,
    className,
    title,
}) =>
    React.createElement(
        'label',
        {
            className: clsx(
                'tw-flex tw-items-center tw-gap-2 tw-cursor-pointer tw-select-none',
                disabled && 'tw-opacity-50 tw-pointer-events-none',
                className,
            ),
            title,
        },
        React.createElement('input', {
            type: 'checkbox',
            checked: isToggled,
            disabled,
            onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
                onToggle(e.target.checked),
            className: 'tw-sr-only',
        }),
        React.createElement(
            'div',
            {
                className: clsx(
                    'tw-relative tw-h-5 tw-w-9 tw-rounded-full tw-transition-colors',
                    isToggled ? 'tw-bg-[#0069C2]' : 'tw-bg-gray-300',
                ),
            },
            React.createElement('div', {
                className: clsx(
                    'tw-absolute tw-top-0.5 tw-h-4 tw-w-4 tw-rounded-full tw-bg-white tw-shadow tw-transition-transform',
                    isToggled ? 'tw-translate-x-4' : 'tw-translate-x-0.5',
                ),
            }),
        ),
        label && React.createElement('span', { className: 'tw-text-sm' }, label),
    );

// Slider – accepts both single-function and array-of-functions onChange (as used by LiveModeSettings)
type SliderOnChange = ((values: number[]) => void) | ((v: number) => void)[];
interface SliderProps {
    values: number[];
    range: { min: number; max: number };
    onChange: SliderOnChange;
    onChangeComplete?: (() => void) | ((values: number[]) => void);
    disabled?: boolean;
    className?: string;
    id?: string;
    ticks?: boolean;
    [key: string]: unknown;
}
export const Slider: FC<SliderProps> = ({
    values,
    range,
    onChange,
    onChangeComplete,
    disabled,
    className,
}) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const v = parseFloat(e.target.value);
        if (Array.isArray(onChange)) {
            onChange[0]?.(v);
        } else {
            (onChange as (values: number[]) => void)([v]);
        }
    };
    return React.createElement('input', {
        type: 'range',
        min: range.min,
        max: range.max,
        value: values[0],
        disabled,
        onChange: handleChange,
        onMouseUp: () => {
            if (typeof onChangeComplete === 'function') {
                (onChangeComplete as () => void)();
            }
        },
        className: clsx('tw-w-full tw-accent-[#0069C2]', className),
    });
};

// NumberInput
// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface UnitDropdown {
    selectedItem?: { value: any; label: string } | null;
    items: { value: any; label: string }[];
    onUnitChange: (item: { value: any; label: string }) => void;
}
interface NumberInputProps {
    label?: string;
    value: number;
    range?: { min: number; max: number; step?: number; decimals?: number };
    onChange?: (value: number) => void;
    onChangeComplete?: (value: number) => void;
    disabled?: boolean;
    showSlider?: boolean;
    unit?: string | UnitDropdown;
    className?: string;
    title?: string;
    size?: string;
    minWidth?: boolean;
    inputMinSize?: number;
    [key: string]: unknown;
}
export const NumberInput: FC<NumberInputProps> = ({
    label,
    value,
    range,
    onChange,
    onChangeComplete,
    disabled,
    showSlider,
    unit,
    className,
}) => {
    const [localValue, setLocalValue] = useState(String(value));
    useEffect(() => setLocalValue(String(value)), [value]);

    const commit = (val: string) => {
        const n = parseFloat(val);
        if (!Number.isNaN(n)) {
            const clamped = range
                ? Math.max(range.min, Math.min(range.max, n))
                : n;
            onChange?.(clamped);
            onChangeComplete?.(clamped);
        }
    };

    return React.createElement(
        'div',
        { className: clsx('tw-flex tw-flex-col tw-gap-1', className) },
        label &&
            React.createElement(
                'label',
                { className: 'tw-text-xs tw-text-gray-600' },
                label,
            ),
        React.createElement(
            'div',
            { className: 'tw-flex tw-items-center tw-gap-1' },
            React.createElement('input', {
                type: 'number',
                value: localValue,
                min: range?.min,
                max: range?.max,
                step: range?.step ?? 1,
                disabled,
                onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
                    setLocalValue(e.target.value);
                    const n = parseFloat(e.target.value);
                    if (!Number.isNaN(n)) onChange?.(n);
                },
                onBlur: (e: React.FocusEvent<HTMLInputElement>) =>
                    commit(e.target.value),
                onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => {
                    if (e.key === 'Enter')
                        commit((e.target as HTMLInputElement).value);
                },
                className:
                    'tw-w-24 tw-rounded tw-border tw-border-gray-300 tw-px-2 tw-py-1 tw-text-sm focus:tw-outline-none focus:tw-border-[#0069C2] disabled:tw-opacity-50',
            }),
            unit &&
                (typeof unit === 'string'
                    ? React.createElement(
                          'span',
                          { className: 'tw-text-xs tw-text-gray-500' },
                          unit,
                      )
                    : React.createElement(
                          'select',
                          {
                              disabled,
                              value: String((unit as UnitDropdown).selectedItem?.value ?? ''),
                              onChange: (e: React.ChangeEvent<HTMLSelectElement>) => {
                                  const item = (unit as UnitDropdown).items.find(
                                      i => String(i.value) === e.target.value,
                                  );
                                  if (item) (unit as UnitDropdown).onUnitChange(item);
                              },
                              className:
                                  'tw-rounded tw-border tw-border-gray-300 tw-px-1 tw-py-1 tw-text-xs focus:tw-outline-none disabled:tw-opacity-50 tw-bg-white',
                          },
                          ...(unit as UnitDropdown).items.map(item =>
                              React.createElement(
                                  'option',
                                  { key: String(item.value), value: String(item.value) },
                                  item.label,
                              ),
                          ),
                      )),
        ),
        showSlider &&
            range &&
            React.createElement(Slider, {
                values: [value],
                range,
                onChange: ([v]) => onChange?.(v),
                onChangeComplete: ([v]) => onChangeComplete?.(v),
                disabled,
            }),
    );
};

// NumberInlineInput (compact inline variant)
export const NumberInlineInput: FC<NumberInputProps> = props =>
    React.createElement(NumberInput, { ...props, showSlider: false });

// Dropdown / StateSelector
interface StateItem<T = string> {
    label: string;
    value: T;
}
interface DropdownProps<T = string> {
    label?: string;
    items: StateItem<T>[];
    onSelect: (item: StateItem<T>) => void;
    selectedItem?: StateItem<T> | null;
    disabled?: boolean;
    className?: string;
    size?: string;
}
export function Dropdown<T = string>({
    label,
    items,
    onSelect,
    selectedItem,
    disabled,
    className,
}: DropdownProps<T>): React.ReactElement {
    return React.createElement(
        'div',
        { className: clsx('tw-flex tw-flex-col tw-gap-1', className) },
        label &&
            React.createElement(
                'label',
                { className: 'tw-text-xs tw-text-gray-600' },
                label,
            ),
        React.createElement(
            'select',
            {
                disabled,
                value: String(selectedItem?.value ?? ''),
                onChange: (e: React.ChangeEvent<HTMLSelectElement>) => {
                    const item = items.find(
                        i => String(i.value) === e.target.value,
                    );
                    if (item) onSelect(item);
                },
                className:
                    'tw-rounded tw-border tw-border-gray-300 tw-px-2 tw-py-1 tw-text-sm focus:tw-outline-none focus:tw-border-[#0069C2] disabled:tw-opacity-50 tw-bg-white',
            },
            ...items.map(item =>
                React.createElement(
                    'option',
                    { key: String(item.value), value: String(item.value) },
                    item.label,
                ),
            ),
        ),
    );
}

// StateSelector has a different API: items can be strings or {key, renderItem} objects,
// and onSelect receives the index (number) when items are strings.
type StateSelectorItem = string | { key: string; renderItem: ReactNode };
interface StateSelectorProps {
    items: StateSelectorItem[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onSelect: (indexOrValue: any) => void;
    selectedItem?: StateSelectorItem | null;
    disabled?: boolean;
    size?: string;
    className?: string;
}
export const StateSelector: FC<StateSelectorProps> = ({
    items,
    onSelect,
    selectedItem,
    disabled,
    className,
}) => {
    const getLabel = (item: StateSelectorItem) =>
        typeof item === 'string' ? item : item.renderItem;
    const getKey = (item: StateSelectorItem) =>
        typeof item === 'string' ? item : item.key;

    const selectedKey =
        selectedItem != null ? getKey(selectedItem) : undefined;

    return React.createElement(
        'select',
        {
            disabled,
            value: selectedKey ?? '',
            onChange: (e: React.ChangeEvent<HTMLSelectElement>) => {
                const idx = items.findIndex(
                    i => getKey(i) === e.target.value,
                );
                if (typeof items[0] === 'string') {
                    // String items: onSelect receives index
                    onSelect(idx);
                } else {
                    // Object items: onSelect receives index
                    onSelect(idx);
                }
            },
            className: clsx(
                'tw-rounded tw-border tw-border-gray-300 tw-px-2 tw-py-1 tw-text-sm focus:tw-outline-none disabled:tw-opacity-50 tw-bg-white',
                className,
            ),
        },
        ...items.map(item =>
            React.createElement(
                'option',
                { key: getKey(item), value: getKey(item) },
                getLabel(item),
            ),
        ),
    );
};

// StartStopButton
interface StartStopButtonProps {
    started: boolean;
    startText?: string;
    stopText?: string;
    onClick?: () => void;
    disabled?: boolean;
    className?: string;
    title?: string;
    showIcon?: boolean;
    large?: boolean;
    variant?: string;
    [key: string]: unknown;
}
export const StartStopButton: FC<StartStopButtonProps> = ({
    started,
    startText = 'Start',
    stopText = 'Stop',
    onClick,
    disabled,
    className,
    title,
}) =>
    React.createElement(
        Button,
        {
            onClick,
            disabled,
            variant: started ? 'danger' : 'primary',
            className,
            title,
        },
        started ? stopText : startText,
    );

// SidePanel wrapper (layout container)
export const SidePanel: FC<{ children?: ReactNode; className?: string }> = ({
    children,
    className,
}) =>
    React.createElement(
        'div',
        {
            className: clsx(
                'tw-flex tw-flex-col tw-overflow-y-auto tw-w-64 tw-shrink-0 tw-bg-gray-50 tw-border-l tw-border-gray-200 tw-p-3 tw-gap-1',
                className,
            ),
        },
        children,
    );

// Alert
interface AlertProps {
    variant?: 'success' | 'warning' | 'danger' | 'info';
    children?: ReactNode;
    className?: string;
}
export const Alert: FC<AlertProps> = ({
    variant = 'info',
    children,
    className,
}) => {
    const variantStyles: Record<string, string> = {
        success: 'tw-bg-green-50 tw-border-green-400 tw-text-green-800',
        warning: 'tw-bg-yellow-50 tw-border-yellow-400 tw-text-yellow-800',
        danger: 'tw-bg-red-50 tw-border-red-400 tw-text-red-800',
        info: 'tw-bg-blue-50 tw-border-blue-400 tw-text-blue-800',
    };
    return React.createElement(
        'div',
        {
            className: clsx(
                'tw-rounded tw-border-l-4 tw-p-3 tw-text-sm',
                variantStyles[variant],
                className,
            ),
        },
        children,
    );
};

// Dialog primitives
interface DialogButtonDef {
    label?: string;
    onClick?: () => void;
    disabled?: boolean;
    variant?: 'primary' | 'secondary' | 'danger';
    children?: ReactNode;
}
export type { DialogButtonDef as DialogButtonType };

export const DialogButton: FC<DialogButtonDef> = ({
    label,
    onClick,
    disabled,
    variant = 'secondary',
    children,
}) =>
    React.createElement(
        Button,
        { onClick, disabled, variant },
        children ?? label,
    );

interface GenericDialogProps {
    isVisible?: boolean;
    title?: string;
    footer?: ReactNode;
    onHide?: () => void;
    closeOnEsc?: boolean;
    children?: ReactNode;
    className?: string;
    size?: 'sm' | 'md' | 'lg' | 'xl';
    headerIcon?: string;
    closeOnUnfocus?: boolean;
}
export const GenericDialog: FC<GenericDialogProps> = ({
    isVisible,
    title,
    footer,
    onHide,
    closeOnEsc = true,
    children,
    className,
}) => {
    useEffect(() => {
        if (!closeOnEsc) return;
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onHide?.();
        };
        if (isVisible) window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [isVisible, closeOnEsc, onHide]);

    if (!isVisible) return null;

    return React.createElement(
        'div',
        {
            className:
                'tw-fixed tw-inset-0 tw-z-50 tw-flex tw-items-center tw-justify-center',
        },
        // Backdrop
        React.createElement('div', {
            className: 'tw-absolute tw-inset-0 tw-bg-black/50',
            onClick: onHide,
        }),
        // Dialog
        React.createElement(
            'div',
            {
                className: clsx(
                    'tw-relative tw-z-10 tw-bg-white tw-rounded-lg tw-shadow-xl tw-flex tw-flex-col tw-max-w-lg tw-w-full tw-mx-4 tw-max-h-[90vh]',
                    className,
                ),
            },
            title &&
                React.createElement(
                    'div',
                    { className: 'tw-flex tw-items-center tw-justify-between tw-p-4 tw-border-b' },
                    React.createElement(
                        'h5',
                        { className: 'tw-font-semibold tw-text-gray-900' },
                        title,
                    ),
                    React.createElement(
                        'button',
                        {
                            type: 'button',
                            onClick: onHide,
                            className: 'tw-text-gray-400 hover:tw-text-gray-600 tw-text-xl tw-leading-none',
                        },
                        '×',
                    ),
                ),
            React.createElement(
                'div',
                { className: 'tw-p-4 tw-overflow-y-auto tw-flex-1' },
                children,
            ),
            footer &&
                React.createElement(
                    'div',
                    { className: 'tw-flex tw-justify-end tw-gap-2 tw-p-4 tw-border-t' },
                    footer,
                ),
        ),
    );
};

interface ConfirmationDialogProps extends GenericDialogProps {
    confirmLabel?: string;
    cancelLabel?: string;
    onConfirm?: () => void;
    onCancel?: () => void;
    optionalLabel?: string;
    onOptional?: () => void;
}
export const ConfirmationDialog: FC<ConfirmationDialogProps> = ({
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    optionalLabel,
    onConfirm,
    onCancel,
    onOptional,
    onHide,
    ...rest
}) =>
    React.createElement(GenericDialog, {
        ...rest,
        onHide: onHide ?? onCancel,
        footer: React.createElement(
            React.Fragment,
            null,
            React.createElement(
                Button,
                { variant: 'secondary', onClick: onCancel ?? onHide },
                cancelLabel,
            ),
            optionalLabel &&
                React.createElement(
                    Button,
                    { variant: 'secondary', onClick: onOptional },
                    optionalLabel,
                ),
            React.createElement(
                Button,
                { variant: 'primary', onClick: onConfirm },
                confirmLabel,
            ),
        ),
    });

// InfoDialog and Dialog with Body sub-component defined below

// Dialog with Body sub-component (used as Dialog.Body in ChartTop)
const DialogBody: FC<{ children?: ReactNode; className?: string }> = ({
    children,
    className,
}) =>
    React.createElement(
        'div',
        { className: clsx('tw-p-2', className) },
        children,
    );

const DialogWithBody = Object.assign(GenericDialog, { Body: DialogBody });
export const Dialog = DialogWithBody;
// Also assign Body to InfoDialog
export const InfoDialog = Object.assign(
    ({
        onOk,
        onHide,
        ...rest
    }: GenericDialogProps & { onOk?: () => void }) =>
        React.createElement(GenericDialog, {
            ...rest,
            onHide: onHide ?? onOk,
            footer: React.createElement(
                Button,
                { variant: 'primary', onClick: onOk ?? onHide },
                'OK',
            ),
        }),
    { Body: DialogBody },
);
