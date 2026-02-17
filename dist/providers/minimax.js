import { BaseProvider } from "./index.js";
export class MiniMaxProvider extends BaseProvider {
    name = "minimax";
    baseUrl = "https://api.minimax.chat/v1";
    models = [
        "minimax-text-01",
    ];
    apiKey = "";
    groupId = "";
    constructor(apiKey, groupId) {
        super();
        this.apiKey = apiKey || process.env.MINIMAX_API_KEY || "";
        this.groupId = groupId || process.env.MINIMAX_GROUP_ID || "";
    }
    async chat(messages, options) {
        if (!this.isConfigured()) {
            throw new Error("MiniMax not configured. Set MINIMAX_API_KEY and MINIMAX_GROUP_ID");
        }
        const model = options?.model || this.models[0];
        const response = await this.fetch("/text/chatcompletion_v2", {
            model,
            messages,
            temperature: options?.temperature ?? 0.7,
            max_tokens: options?.max_tokens,
            group_id: this.groupId,
        });
        return {
            content: response.choices[0]?.message?.content || "",
            usage: response.usage,
        };
    }
}
//# sourceMappingURL=minimax.js.map