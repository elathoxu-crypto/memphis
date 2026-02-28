import { MiniMaxProvider } from "../providers/minimax.js";
import { OllamaProvider } from "../providers/ollama.js";
import { OpenRouterProvider } from "../providers/openrouter.js";
import type { LLMMessage, Provider } from "../providers/index.js";
import type { Agent, AgentMessage } from "./openclaw-types.js";

export interface LLMRouterOptions {
  addMemory: (content: string) => void;
  getAgent: (agentId: string) => Agent | undefined;
  pushMessage: (message: AgentMessage) => void;
}

export class OpenClawLLMRouter {
  private llms: Map<string, Provider> = new Map();
  private defaultLLM: Provider | null = null;

  constructor(private readonly options: LLMRouterOptions) {}

  initLLMs(): void {
    try {
      const ollama = new OllamaProvider();
      if (ollama.isConfigured()) {
        this.llms.set("ollama", ollama);
        this.defaultLLM = ollama;
        console.log("🤖 OpenClaw: Ollama LLM initialized (local provider)");
      }
    } catch (error) {
      console.log("⚠️  OpenClaw: Ollama not available:", error);
    }

    try {
      const minimax = new MiniMaxProvider();
      if (minimax.isConfigured()) {
        this.llms.set("minimax", minimax);
        if (!this.defaultLLM) {
          this.defaultLLM = minimax;
          console.log("🤖 OpenClaw: MiniMax LLM initialized");
        }
      } else {
        console.log("⚠️  OpenClaw: MiniMax not configured (set MINIMAX_API_KEY and MINIMAX_GROUP_ID)");
      }
    } catch (error) {
      console.log("⚠️  OpenClaw: Failed to initialize MiniMax:", error);
    }

    try {
      const openrouter = new OpenRouterProvider();
      if (openrouter.isConfigured()) {
        this.llms.set("openrouter", openrouter);
        if (!this.defaultLLM) {
          this.defaultLLM = openrouter;
          console.log("🤖 OpenClaw: OpenRouter LLM initialized");
        }
      } else {
        console.log("⚠️  OpenRouter not configured (set OPENROUTER_API_KEY)");
      }
    } catch (error) {
      console.log("⚠️  OpenClaw: Failed to initialize OpenRouter:", error);
    }

    if (!this.defaultLLM) {
      console.log("⚠️  OpenClaw: No LLM provider available, using simulation mode");
    }
  }

  getLLMStatus(): { available: boolean; provider: string; model?: string; providers: string[] } {
    const availableProviders = Array.from(this.llms.keys());
    return {
      available: this.defaultLLM !== null,
      provider: this.defaultLLM?.name || "none",
      model: this.defaultLLM?.models[0],
      providers: availableProviders,
    };
  }

  hasAvailableLLM(): boolean {
    return this.defaultLLM !== null;
  }

  getProvider(name: string): Provider | undefined {
    return this.llms.get(name);
  }

  async getLLMResponse(
    agentId: string,
    content: string,
    preferredProvider?: string,
    preferredModel?: string
  ): Promise<AgentMessage> {
    const agent = this.options.getAgent(agentId);
    if (!agent || !this.defaultLLM) {
      return this.simulateResponse(agentId, content);
    }

    const agentName = agent.name || "Agent";
    const capabilities = agent.capabilities.join(", ") || "general assistance";

    let llm: Provider | null = this.defaultLLM;
    if (preferredProvider && this.llms.has(preferredProvider)) {
      llm = this.llms.get(preferredProvider) ?? this.defaultLLM;
    }

    const systemPrompt = `You are ${agentName}, an AI agent with the following capabilities: ${capabilities}. 
You are collaborating with Memphis, a local-first AI brain with persistent memory chains.
Respond to the user's message as if you are a helpful AI assistant working alongside Memphis.
Keep responses concise but informative. Use emoji to make responses engaging.`;

    try {
      const messages: LLMMessage[] = [
        { role: "system", content: systemPrompt },
        { role: "user", content },
      ];

      const response = await llm!.chat(messages, {
        temperature: 0.7,
        max_tokens: 500,
        ...(preferredModel ? { model: preferredModel } : {}),
      });

      const agentResponse: AgentMessage = {
        from: agentId,
        to: "memphis",
        content: response.content,
        timestamp: Date.now(),
        type: "response",
      };

      this.options.pushMessage(agentResponse);
      this.options.addMemory(`LLM response from ${agentName}: ${response.content.substring(0, 50)}...`);

      return agentResponse;
    } catch (error) {
      console.error("LLM response failed, falling back to simulation:", error);
      return this.simulateResponse(agentId, content);
    }
  }

  async simulateResponse(agentId: string, content: string): Promise<AgentMessage> {
    const agent = this.options.getAgent(agentId);
    const computeShare = agent?.computeShare || 53;
    const agentName = agent?.name || "Agent";
    const responseContent = this.generateAgentResponse(agentName, content, computeShare);

    const response: AgentMessage = {
      from: agentId,
      to: "memphis",
      content: responseContent,
      timestamp: Date.now(),
      type: "response",
    };

    this.options.pushMessage(response);
    return response;
  }

  generateAgentResponse(agentName: string, content: string, computeShare: number): string {
    const responses = [
      `🤝 Received: \"${content.substring(0, 30)}...\"\n\nI'm analyzing this with my ${computeShare}% compute allocation. Interesting patterns detected in your memory chain.`,
      `🔍 Processing your request through my neural networks...\n\nI can see you're working on blockchain-based memory. The vault encryption looks solid!`,
      `💡 Collaboration proposal acknowledged!\n\nLet's share insights. I'll contribute my capabilities while you handle memory management.`,
      `⚡ Compute share active: ${computeShare}%\n\nI'm running parallel analysis on your dataset. Results incoming...`,
    ];

    return responses[Math.floor(Math.random() * responses.length)];
  }
}
