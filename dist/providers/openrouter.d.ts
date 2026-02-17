import { BaseProvider } from "./base.js";
import type { LLMMessage, LLMResponse } from "./index.js";
export declare class OpenRouterProvider extends BaseProvider {
    name: string;
    baseUrl: string;
    models: string[];
    apiKey: string;
    constructor(apiKey?: string);
    chat(messages: LLMMessage[], options?: {
        model?: string;
        temperature?: number;
        max_tokens?: number;
    }): Promise<LLMResponse>;
}
