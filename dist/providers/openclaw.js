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
export class OpenClawProvider extends BaseProvider {
    name = "openclaw";
    baseUrl = "http://localhost:18789"; // Gateway port
    models = ["minimax-m2.5", "minimax-m2.1"];
    apiKey = ""; // Not needed - gateway handles auth
    model;
    constructor(options) {
        super();
        this.model = options?.model || "minimax-m2.5";
        this.baseUrl = options?.baseUrl || this.baseUrl;
    }
    isConfigured() {
        // Check if gateway is running
        try {
            const http = require("http");
            return require("net").connect(18789) !== null;
        }
        catch {
            return false;
        }
    }
    async chat(messages, options) {
        const model = options?.model || this.model;
        // Convert messages to OpenAI format
        const openAIMessages = messages.map(m => ({
            role: m.role,
            content: m.content,
        }));
        try {
            const response = await fetch(`${this.baseUrl}/v1/chat/completions`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    model: `minimax-portal/${model}`,
                    messages: openAIMessages,
                    temperature: options?.temperature ?? 0.7,
                    max_tokens: options?.max_tokens ?? 4096,
                }),
            });
            if (!response.ok) {
                throw new Error(`Gateway error: ${response.status} ${response.statusText}`);
            }
            const data = await response.json();
            return {
                content: data.choices[0]?.message?.content || "",
                usage: data.usage || {
                    prompt_tokens: 0,
                    completion_tokens: 0,
                    total_tokens: 0,
                },
            };
        }
        catch (error) {
            throw new Error(`OpenClaw provider error: ${error}`);
        }
    }
}
/**
 * Check if OpenClaw gateway is available
 */
export async function isGatewayAvailable() {
    return new Promise((resolve) => {
        import("net").then(net => {
            const socket = new net.Socket();
            socket.setTimeout(3000);
            socket.on("connect", () => {
                socket.destroy();
                resolve(true);
            });
            socket.on("timeout", () => {
                socket.destroy();
                resolve(false);
            });
            socket.on("error", () => {
                resolve(false);
            });
            socket.connect(18789, "127.0.0.1");
        }).catch(() => resolve(false));
    });
}
/**
 * Get available models from gateway
 */
export async function getGatewayModels() {
    try {
        const response = await fetch("http://localhost:18789/api/models", {
            method: "GET",
            signal: AbortSignal.timeout(3000),
        });
        const data = await response.json();
        return data.models?.map((m) => m.id) || [];
    }
    catch {
        return [];
    }
}
//# sourceMappingURL=openclaw.js.map