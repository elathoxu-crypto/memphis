import type { LLMMessage, LLMResponse, Provider } from "./index.js";
export declare abstract class BaseProvider implements Provider {
    abstract name: string;
    abstract models: string[];
    abstract apiKey: string;
    abstract baseUrl: string;
    isConfigured(): boolean;
    abstract chat(messages: LLMMessage[], options?: {
        model?: string;
        temperature?: number;
        max_tokens?: number;
    }): Promise<LLMResponse>;
    protected fetch<T>(endpoint: string, body: object): Promise<T>;
}
