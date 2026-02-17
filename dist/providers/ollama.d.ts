import { BaseProvider } from "./base.js";
import type { LLMMessage, LLMResponse } from "./index.js";
export declare class OllamaProvider extends BaseProvider {
    name: string;
    baseUrl: string;
    models: string[];
    defaultModel: string;
    apiKey: string;
    constructor();
    isConfigured(): boolean;
    getDefaultModel(): string;
    chat(messages: LLMMessage[], options?: {
        model?: string;
        temperature?: number;
        max_tokens?: number;
    }): Promise<LLMResponse>;
}
