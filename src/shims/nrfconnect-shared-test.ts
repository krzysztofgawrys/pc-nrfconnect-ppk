// Stub for test utilities – only used in test files
export const testUtils = {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    render: (..._args: any[]) => {
        throw new Error('testUtils.render not implemented in standalone build');
    },
};
