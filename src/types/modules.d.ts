// Allow importing GIF/image files
declare module '*.gif' {
    const src: string;
    export default src;
}

declare module '*.png' {
    const src: string;
    export default src;
}

declare module '*.svg' {
    const src: string;
    export default src;
}

// react-chartjs-2 sub-path types
declare module 'react-chartjs-2/dist/types' {
    export * from 'react-chartjs-2';
    import type { Chart } from 'chart.js';
    import type { ForwardedRef as ReactForwardedRef } from 'react';
    // ChartJSOrUndefined must accept Chart.js generic parameters
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    export type ChartJSOrUndefined<_T = unknown, _DS = any, _L = unknown> =
        | Chart<any, any, any>
        | undefined;
    export type ForwardedRef<T> = ReactForwardedRef<T>;
}
