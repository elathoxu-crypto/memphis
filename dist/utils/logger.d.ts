export declare const log: {
    info: (msg: string) => void;
    success: (msg: string) => void;
    warn: (msg: string) => void;
    error: (msg: string) => void;
    block: (chain: string, index: number, hash: string) => void;
    chain: (name: string, count: number) => void;
};
