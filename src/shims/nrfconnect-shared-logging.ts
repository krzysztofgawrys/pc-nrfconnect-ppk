import electronLog from 'electron-log/renderer';

const logger = {
    info: (msg: unknown, ...args: unknown[]) => electronLog.info(msg, ...args),
    warn: (msg: unknown, ...args: unknown[]) => electronLog.warn(msg, ...args),
    error: (msg: unknown, ...args: unknown[]) =>
        electronLog.error(msg, ...args),
    debug: (msg: unknown, ...args: unknown[]) =>
        electronLog.debug(msg, ...args),
};

export default logger;
