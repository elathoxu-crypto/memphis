import { BaseProvider } from "./base.js";
export class MiniMaxProvider extends BaseProvider {
    name = "minimax";
    baseUrl = "https://api.minimax.chat/v1";
    models = [
        "minimax-text-01",
        // M2.5 series models
        "abab6.5s-chat",
        "abab6.5g-chat",
        "abab6.5s-chat-200k",
        "abab6.5g-chat-200k",
        // M2 series models
        "abab6-chat",
        "abab5.5s-chat",
        "abab5.5g-chat",
    ];
    apiKey = "";
    groupId = "";
    constructor(apiKey, groupId) {
        super();
        this.apiKey = apiKey || process.env.MINIMAX_API_KEY || "";
        this.groupId = groupId || process.env.MINIMAX_GROUP_ID || "";
    }
    isConfigured() {
        return !!this.apiKey && !!this.groupId && this.apiKey.length > 0 && this.groupId.length > 0;
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