export interface VerifyOptions {
    chain?: string;
    json?: boolean;
    verbose?: boolean;
}
export declare function verifyCommand(options?: VerifyOptions): Promise<void>;
