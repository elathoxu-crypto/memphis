import { BaseProvider } from "./base.js";
export class OpenRouterProvider extends BaseProvider {
    name = "openrouter";
    baseUrl = "https://openrouter.ai/api/v1";
    models = [
        "anthropic/claude-3.5-sonnet",
        "anthropic/claude-3-opus",
        "google/gemini-pro-1.5",
        "meta-llama/llama-3.1-70b-instruct",
    ];
    apiKey = "";
    constructor(apiKey) {
        super();
        this.apiKey = apiKey || process.env.OPENROUTER_API_KEY || "";
    }
    async chat(messages, options) {
        const model = options?.model || this.models[0];
        const response = await this.fetch("/chat/completions", {
            model,
            messages,
            temperature: options?.temperature ?? 0.7,
            max_tokens: options?.max_tokens,
        });
        return {
            content: response.choices[0]?.message?.content || "",
            usage: response.usage,
        };
    }
}
//# sourceMappingURL=openrouter.js.map