export declare function recallCommand(scopeOrKeyword: string, query: string | undefined, options: {
    chain?: string;
    limit?: string;
    tag?: string;
    since?: string;
    project?: boolean;
    all?: boolean;
}): Promise<void>;
