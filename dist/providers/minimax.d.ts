import { BaseProvider } from "./base.js";
import type { LLMMessage, LLMResponse } from "./index.js";
export declare class MiniMaxProvider extends BaseProvider {
    name: string;
    baseUrl: string;
    models: string[];
    apiKey: string;
    groupId: string;
    constructor(apiKey?: string, groupId?: string);
    isConfigured(): boolean;
    chat(messages: LLMMessage[], options?: {
        model?: string;
        temperature?: number;
        max_tokens?: number;
    }): Promise<LLMResponse>;
}
