/**
 * OpenClaw Gateway Provider for Memphis
 *
 * Uses the OpenClaw gateway to make API calls.
 * This allows Memphis to use the same MiniMax/Ollama credentials as OpenClaw.
 *
 * SECURITY:
 * - API keys are never stored in Memphis
 * - All calls go through gateway
 * - Gateway handles authentication
 */
import { BaseProvider } from "./base.js";
import type { LLMMessage, LLMResponse } from "./index.js";
export declare class OpenClawProvider extends BaseProvider {
    name: string;
    baseUrl: string;
    models: string[];
    apiKey: string;
    private model;
    constructor(options?: {
        model?: string;
        baseUrl?: string;
    });
    isConfigured(): boolean;
    chat(messages: LLMMessage[], options?: {
        model?: string;
        temperature?: number;
        max_tokens?: number;
    }): Promise<LLMResponse>;
}
/**
 * Check if OpenClaw gateway is available
 */
export declare function isGatewayAvailable(): Promise<boolean>;
/**
 * Get available models from gateway
 */
export declare function getGatewayModels(): Promise<string[]>;
