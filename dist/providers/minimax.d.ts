import { BaseProvider, type LLMMessage, type LLMResponse } from "./index.js";
export declare class MiniMaxProvider extends BaseProvider {
    name: string;
    baseUrl: string;
    models: string[];
    apiKey: string;
    groupId: string;
    constructor(apiKey?: string, groupId?: string);
    chat(messages: LLMMessage[], options?: {
        model?: string;
        temperature?: number;
        max_tokens?: number;
    }): Promise<LLMResponse>;
}
