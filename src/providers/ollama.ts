import { BaseProvider, type LLMMessage, type LLMResponse } from "./index.js";

export class OllamaProvider extends BaseProvider {
  name = "ollama";
  baseUrl = "http://localhost:11434/v1";
  models = [
    "llama3.1",
    "llama3",
    "mistral",
    "codellama",
  ];
  
  apiKey = "ollama"; // Ollama doesn't need real key
  
  constructor() {
    super();
    // Ollama uses default localhost URL
    this.baseUrl = process.env.OLLAMA_BASE_URL || "http://localhost:11434/v1";
  }
  
  isConfigured(): boolean {
    // Ollama is "configured" if the server is running
    return true;
  }
  
  async chat(
    messages: LLMMessage[],
    options?: {
      model?: string;
      temperature?: number;
      max_tokens?: number;
    }
  ): Promise<LLMResponse> {
    const model = options?.model || this.models[0];
    
    const response = await this.fetch<{
      choices: Array<{ message: { content: string } }>;
      usage: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
      };
    }>("/chat/completions", {
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
