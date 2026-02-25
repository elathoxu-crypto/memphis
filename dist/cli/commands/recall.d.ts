export declare function recallCommand(scopeOrKeyword: string, queryText: string | undefined, options: {
    chain?: string;
    limit?: string;
    tag?: string;
    since?: string;
    until?: string;
    type?: string;
    project?: boolean;
    all?: boolean;
    json?: boolean;
    includeVault?: boolean;
}): Promise<void>;
