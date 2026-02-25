export declare function askCommand(question: string, options?: {
    useVault?: boolean;
    vaultPassword?: string;
    model?: string;
    top?: number;
    since?: string;
    provider?: string;
    includeVault?: boolean;
    noSave?: boolean;
    json?: boolean;
    preferSummaries?: boolean;
    noSummaries?: boolean;
    summariesMax?: number;
    explainContext?: boolean;
}): Promise<void>;
