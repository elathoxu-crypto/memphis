export interface FallbackConfig {
    models: string[];
    timeout: number;
}
export declare class FallbackLLM {
    private models;
    private currentIndex;
    constructor(models?: string[]);
    getCurrentModel(): string;
    next(): boolean;
    reset(): void;
    executeWithFallback<T>(fn: (model: string) => Promise<T>, onFallback?: (model: string, error: Error) => void): Promise<T>;
}
export declare const fallbackLLM: FallbackLLM;
