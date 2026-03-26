const describeError = (e: unknown): string =>
    e instanceof Error ? e.message : String(e);

export default describeError;
