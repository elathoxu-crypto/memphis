export interface StatusOptions {
    json?: boolean;
    verbose?: boolean;
}
export declare function statusCommand(options?: StatusOptions): Promise<void>;
