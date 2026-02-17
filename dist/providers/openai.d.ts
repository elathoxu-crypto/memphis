import { BaseProvider, type LLMMessage, type LLMResponse } from "./index.js";
export declare class OpenAIProvider extends BaseProvider {
    name: string;
    baseUrl: string;
    models: string[];
    apiKey: string;
    constructor();
    isConfigured(): boolean;
    chat(messages: LLMMessage[], options?: {
        model?: string;
        temperature?: number;
        max_tokens?: number;
    }): Promise<LLMResponse>;
}
