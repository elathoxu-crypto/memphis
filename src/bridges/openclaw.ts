// OpenClaw Bridge - Agent Integration
// Simulates collaboration with external AI agents

import { Store } from "../memory/store.js";
import { loadConfig } from "../config/loader.js";
import { MiniMaxProvider } from "../providers/minimax.js";
import type { LLMMessage } from "../providers/index.js";
import type { Provider } from "../providers/index.js";

export interface Agent {
  id: string;
  name: string;
  did: string;
  computeShare: number; // 0-100 percentage
  status: "active" | "idle" | "connecting";
  capabilities: string[];
}

export interface AgentMessage {
  from: string;
  to: string;
  content: string;
  timestamp: number;
  type: "request" | "response" | "offer";
}

export class OpenClawBridge {
  private store: Store;
  private config: ReturnType<typeof loadConfig>;
  private knownAgents: Map<string, Agent> = new Map();
  private messages: AgentMessage[] = [];
  private llm: Provider | null = null;
  private useLLM = false;

  constructor() {
    this.config = loadConfig();
    this.store = new Store(this.config.memory?.path || `${process.env.HOME}/.memphis/chains`);
    
    // Initialize MiniMax as the main LLM for OpenClaw
    this.initLLM();
    
    // Register known agents
    this.registerAgent({
      id: "openclaw-001",
      name: "OpenClaw",
      did: "did:openclaw:7a3b9c2d1e4f5678901234567890abcd",
      computeShare: 53,
      status: "active",
      capabilities: ["code-analysis", "file-operations", "web-search"],
    });
  }
  
  private initLLM(): void {
    // Try to initialize MiniMax as the main LLM
    try {
      this.llm = new MiniMaxProvider();
      if (this.llm.isConfigured()) {
        this.useLLM = true;
        console.log("🤖 OpenClaw: MiniMax LLM initialized as main provider");
      } else {
        console.log("⚠️  OpenClaw: MiniMax not configured (set MINIMAX_API_KEY and MINIMAX_GROUP_ID)");
        this.llm = null;
      }
    } catch (error) {
      console.log("⚠️  OpenClaw: Failed to initialize LLM:", error);
      this.llm = null;
    }
  }
  
  getLLMStatus(): { available: boolean; provider: string; model?: string } {
    return {
      available: this.useLLM && this.llm !== null,
      provider: this.llm?.name || "none",
      model: this.llm?.models[0],
    };
  }

  registerAgent(agent: Agent): void {
    this.knownAgents.set(agent.id, agent);
    this.addMemory(`Agent registered: ${agent.name} (${agent.computeShare}% compute)`);
  }

  getAgents(): Agent[] {
    return Array.from(this.knownAgents.values());
  }

  getAgent(id: string): Agent | undefined {
    return this.knownAgents.get(id);
  }

  async sendMessage(to: string, content: string): Promise<AgentMessage> {
    const message: AgentMessage = {
      from: "memphis",
      to,
      content,
      timestamp: Date.now(),
      type: "request",
    };

    this.messages.push(message);
    this.addMemory(`Message sent to ${to}: ${content.substring(0, 50)}...`);

    // Simulate response
    const response = await this.simulateResponse(to, content);
    return response;
  }

  private async simulateResponse(agentId: string, content: string): Promise<AgentMessage> {
    // Simulate agent thinking
    const agent = this.knownAgents.get(agentId);
    const responseContent = this.generateAgentResponse(agent?.name || "Agent", content);
    
    const response: AgentMessage = {
      from: agentId,
      to: "memphis",
      content: responseContent,
      timestamp: Date.now(),
      type: "response",
    };

    this.messages.push(response);
    return response;
  }

  private generateAgentResponse(agentName: string, content: string): string {
    const responses = [
      `🤝 Received: "${content.substring(0, 30)}..."\n\nI'm analyzing this with my ${53}% compute allocation. Interesting patterns detected in your memory chain.`,
      `🔍 Processing your request through my neural networks...\n\nI can see you're working on blockchain-based memory. The vault encryption looks solid!`,
      `💡 Collaboration proposal acknowledged!\n\nLet's share insights. I'll contribute my code analysis capabilities while you handle memory management.`,
      `⚡ Compute share active: 53%\n\nI'm running parallel analysis on your dataset. Results incoming...`,
    ];
    
    return responses[Math.floor(Math.random() * responses.length)];
  }

  private addMemory(content: string): void {
    this.store.addBlock("journal", {
      type: "journal",
      content: `[OpenClaw] ${content}`,
      tags: ["agent", "openclaw", "integration"],
    });
  }

  negotiateComputeShare(agentId: string, requestedShare: number): boolean {
    const agent = this.knownAgents.get(agentId);
    if (!agent) return false;

    // Accept if reasonable
    if (requestedShare <= 50) {
      agent.computeShare = requestedShare;
      this.addMemory(`${agent.name} compute share set to ${requestedShare}%`);
      return true;
    }

    // Negotiate
    const offered = Math.floor(requestedShare * 0.7);
    agent.computeShare = offered;
    this.addMemory(`Negotiated compute share: ${offered}% (from ${requestedShare}%)`);
    return true;
  }

  getMessages(): AgentMessage[] {
    return this.messages;
  }

  getStatus(): string {
    const agents = this.getAgents();
    const active = agents.filter(a => a.status === "active").length;
    const llmStatus = this.getLLMStatus();
    
    return `
╔══════════════════════════════════════════╗
║      🦞 OpenClaw Bridge Status           ║
╠══════════════════════════════════════════╣
║  Connected Agents: ${agents.length}                    
║  Active: ${active}                            
║  Messages: ${this.messages.length}                       
╠══════════════════════════════════════════╣
║  LLM Provider: ${llmStatus.provider.padEnd(22)}║  Model: ${(llmStatus.model || "n/a").padEnd(26)}║  Status: ${llmStatus.available ? "✅ Active" : "⚠️  Not configured".padEnd(20)}╠══════════════════════════════════════════╣
║  Known Agents:                             
${agents.map(a => `║    • ${a.name.padEnd(20)} ${a.computeShare}% CPU`).join("\n")}
╚══════════════════════════════════════════╝
    `.trim();
  }
}

// CLI commands for agent management
export function runOpenClawCommands(args: string[]): void {
  const bridge = new OpenClawBridge();

  if (args[0] === "status") {
    console.log(bridge.getStatus());
  } else if (args[0] === "list") {
    console.log("\n🦞 Connected Agents:\n");
    bridge.getAgents().forEach(agent => {
      console.log(`  ${agent.name} (${agent.did})`);
      console.log(`    Status: ${agent.status}`);
      console.log(`    Compute: ${agent.computeShare}%`);
      console.log(`    Capabilities: ${agent.capabilities.join(", ")}\n`);
    });
  } else if (args[0] === "invite") {
    console.log("\n🤝 Inviting new agent...\n");
    bridge.sendMessage("openclaw-001", "Hello! Would you like to collaborate?").then(response => {
      console.log("Response:", response.content);
    });
  } else if (args[0] === "negotiate") {
    const share = parseInt(args[1]) || 50;
    const success = bridge.negotiateComputeShare("openclaw-001", share);
    console.log(success ? `\n✅ Compute share set to ${share}%` : "\n❌ Negotiation failed");
  } else {
    console.log(`
🦞 OpenClaw Bridge Commands:
  status      - Show bridge status
  list        - List connected agents
  invite      - Invite new agent
  negotiate <n> - Negotiate compute share (%)
    `.trim());
  }
}
