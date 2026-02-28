// OpenClaw Bridge - Agent Integration
// Collaboration with external AI agents using multiple LLM providers

import { Store } from "../memory/store.js";
import { loadConfig } from "../config/loader.js";
import { MiniMaxProvider } from "../providers/minimax.js";
import { OllamaProvider } from "../providers/ollama.js";
import { OpenRouterProvider } from "../providers/openrouter.js";
import type { LLMMessage, Provider } from "../providers/index.js";

export interface Agent {
  id: string;
  name: string;
  did: string;
  computeShare: number; // 0-100 percentage
  status: "active" | "idle" | "connecting";
  capabilities: string[];
  model?: string; // Preferred LLM model
  provider?: string; // Preferred LLM provider
}

export interface AgentMessage {
  from: string;
  to: string;
  content: string;
  timestamp: number;
  type: "request" | "response" | "offer" | "broadcast";
}

export interface NegotiateResult {
  success: boolean;
  agreed?: number;
  message: string;
}

export interface Task {
  id: string;
  agentId: string;
  task: string;
  status: "pending" | "running" | "completed" | "failed";
  result?: string;
  createdAt: number;
  completedAt?: number;
}

export interface AgentState {
  agentId: string;
  computeShare: number;
  status: "active" | "idle" | "connecting";
  lastActive: number;
  messagesSent: number;
  messagesReceived: number;
}

// CollaborativeTask - for multi-agent collaboration
export interface CollaborativeTask {
  id: string;
  description: string;
  subtasks: SubTask[];
  status: "pending" | "delegating" | "running" | "aggregating" | "completed" | "failed";
  leadAgent: string;
  results: Map<string, string>;
  createdAt: number;
  completedAt?: number;
}

export interface SubTask {
  id: string;
  agentId: string;
  description: string;
  status: "pending" | "assigned" | "completed" | "failed";
  result?: string;
}

// Singleton bridge instance for state persistence
let bridgeInstance: OpenClawBridge | null = null;

export class OpenClawBridge {
  private store: Store;
  private config: ReturnType<typeof loadConfig>;
  private knownAgents: Map<string, Agent> = new Map();
  private messages: AgentMessage[] = [];
  private tasks: Map<string, Task> = new Map();
  private collaborativeTasks: Map<string, CollaborativeTask> = new Map();
  private agentStates: Map<string, AgentState> = new Map();
  private llms: Map<string, Provider> = new Map();
  private defaultLLM: Provider | null = null;

  constructor() {
    // Return existing instance if available (singleton pattern)
    if (bridgeInstance) {
      // Copy all state from existing instance
      this.store = bridgeInstance.store;
      this.config = bridgeInstance.config;
      this.knownAgents = bridgeInstance.knownAgents;
      this.messages = bridgeInstance.messages;
      this.tasks = bridgeInstance.tasks;
      this.collaborativeTasks = bridgeInstance.collaborativeTasks;
      this.agentStates = bridgeInstance.agentStates;
      this.llms = bridgeInstance.llms;
      this.defaultLLM = bridgeInstance.defaultLLM;
      return;
    }
    
    bridgeInstance = this;
    
    this.config = loadConfig();
    this.store = new Store(this.config.memory?.path || `${process.env.HOME}/.memphis/chains`);
    
    // Initialize multiple LLM providers
    this.initLLMs();
    
    // Register known agents
    this.registerAgent({
      id: "openclaw-001",
      name: "OpenClaw",
      did: "did:openclaw:7a3b9c2d1e4f5678901234567890abcd",
      computeShare: 53,
      status: "active",
      capabilities: ["code-analysis", "file-operations", "web-search", "coordination"],
      model: "llama3",
      provider: "ollama",
    });
    
    // Register additional agents with diverse capabilities
    this.registerAgent({
      id: "openclaw-002",
      name: "CodeMaster",
      did: "did:openclaw:8b4c0d3e5f6a78901234567890bcde",
      computeShare: 25,
      status: "idle",
      capabilities: ["code-review", "refactoring", "bug-detection"],
      model: "llama3",
      provider: "ollama",
    });
    
    this.registerAgent({
      id: "openclaw-003",
      name: "DataSage",
      did: "did:openclaw:9c5d1e4f6a7b890123456789012cdef",
      computeShare: 15,
      status: "idle",
      capabilities: ["data-analysis", "visualization", "statistics"],
      model: "llama3",
      provider: "ollama",
    });
    
    // Register research agent
    this.registerAgent({
      id: "openclaw-004",
      name: "ResearchBot",
      did: "did:openclaw:0d6e2f5a7b8c901234567890123def0",
      computeShare: 7,
      status: "idle",
      capabilities: ["research", "documentation", "web-search", "summarization"],
      model: "llama3",
      provider: "ollama",
    });
    
    // Load persisted agent states
    this.loadAgentStates();
  }
  
  private initLLMs(): void {
    // Initialize Ollama (local, most reliable fallback)
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
    
    // Initialize MiniMax
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
    
    // Initialize OpenRouter
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
  
  getProvider(name: string): Provider | undefined {
    return this.llms.get(name);
  }

  registerAgent(agent: Agent): void {
    this.knownAgents.set(agent.id, agent);
    // Initialize agent state
    this.agentStates.set(agent.id, {
      agentId: agent.id,
      computeShare: agent.computeShare,
      status: agent.status,
      lastActive: Date.now(),
      messagesSent: 0,
      messagesReceived: 0,
    });
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
    this.updateAgentState(to, "messagesReceived");
    this.addMemory(`Message sent to ${to}: ${content.substring(0, 50)}...`);

    // Get real response from LLM if available, otherwise simulate
    let response: AgentMessage;
    const agent = this.knownAgents.get(to);
    if (this.defaultLLM && agent) {
      response = await this.getLLMResponse(to, content, agent.provider, agent.model);
    } else {
      response = await this.simulateResponse(to, content);
    }
    
    this.updateAgentState(to, "messagesSent");
    return response;
  }

  private async getLLMResponse(agentId: string, content: string, preferredProvider?: string, preferredModel?: string): Promise<AgentMessage> {
    const agent = this.knownAgents.get(agentId);
    const agentName = agent?.name || "Agent";
    const capabilities = agent?.capabilities.join(", ") || "general assistance";
    
    // Use preferred provider if available
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
        { role: "user", content: content }
      ];
      
      const response = await llm!.chat(messages, {
        temperature: 0.7,
        max_tokens: 500
      });
      
      const agentResponse: AgentMessage = {
        from: agentId,
        to: "memphis",
        content: response.content,
        timestamp: Date.now(),
        type: "response",
      };

      this.messages.push(agentResponse);
      this.addMemory(`LLM response from ${agentName}: ${response.content.substring(0, 50)}...`);
      
      return agentResponse;
    } catch (error) {
      console.error("LLM response failed, falling back to simulation:", error);
      return this.simulateResponse(agentId, content);
    }
  }

  private async simulateResponse(agentId: string, content: string): Promise<AgentMessage> {
    const agent = this.knownAgents.get(agentId);
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

    this.messages.push(response);
    return response;
  }

  private generateAgentResponse(agentName: string, content: string, computeShare: number): string {
    const responses = [
      `🤝 Received: "${content.substring(0, 30)}..."\n\nI'm analyzing this with my ${computeShare}% compute allocation. Interesting patterns detected in your memory chain.`,
      `🔍 Processing your request through my neural networks...\n\nI can see you're working on blockchain-based memory. The vault encryption looks solid!`,
      `💡 Collaboration proposal acknowledged!\n\nLet's share insights. I'll contribute my capabilities while you handle memory management.`,
      `⚡ Compute share active: ${computeShare}%\n\nI'm running parallel analysis on your dataset. Results incoming...`,
    ];
    
    return responses[Math.floor(Math.random() * responses.length)];
  }

  private addMemory(content: string): void {
    this.store.appendBlock("journal", {
      type: "journal",
      content: `[OpenClaw] ${content}`,
      tags: ["agent", "openclaw", "integration"],
    }).catch(() => {});
  }

  negotiateComputeShare(agentId: string, requestedShare: number): NegotiateResult {
    const agent = this.knownAgents.get(agentId);
    if (!agent) {
      return { success: false, message: "Agent not found" };
    }

    const maxShare = 80;
    const minShare = 5;
    
    // Validate requested share
    if (requestedShare < minShare) {
      return { success: false, message: `Minimum compute share is ${minShare}%` };
    }
    if (requestedShare > maxShare) {
      requestedShare = maxShare;
    }

    // Accept if within reasonable range (up to 50%)
    if (requestedShare <= 50) {
      agent.computeShare = requestedShare;
      this.updateAgentState(agentId, "computeShare", requestedShare);
      this.addMemory(`${agent.name} compute share set to ${requestedShare}%`);
      return { success: true, agreed: requestedShare, message: `Accepted: ${requestedShare}% compute share` };
    }

    // Negotiate for higher requests
    const offered = Math.floor(requestedShare * 0.7);
    const finalOffer = Math.max(offered, minShare);
    agent.computeShare = finalOffer;
    this.updateAgentState(agentId, "computeShare", finalOffer);
    
    this.addMemory(`Negotiated compute share: ${finalOffer}% (from ${requestedShare}%)`);
    return { 
      success: true, 
      agreed: finalOffer, 
      message: `Negotiated: ${finalOffer}% (from ${requestedShare}%)` 
    };
  }

  // Agent-to-agent communication
  async sendMessageBetweenAgents(fromId: string, toId: string, content: string): Promise<AgentMessage> {
    const fromAgent = this.knownAgents.get(fromId);
    const toAgent = this.knownAgents.get(toId);
    
    if (!fromAgent || !toAgent) {
      throw new Error("One or both agents not found");
    }
    
    const message: AgentMessage = {
      from: fromId,
      to: toId,
      content,
      timestamp: Date.now(),
      type: "request",
    };
    
    this.messages.push(message);
    this.addMemory(`${fromAgent.name} sent message to ${toAgent.name}: ${content.substring(0, 30)}...`);
    
    // Generate response from target agent
    let response: AgentMessage;
    if (this.defaultLLM) {
      response = await this.getLLMResponse(toId, content, toAgent.provider, toAgent.model);
    } else {
      response = await this.simulateResponse(toId, content);
    }
    
    return response;
  }

  // Broadcast message to all agents
  async broadcastToAgents(content: string, excludeIds: string[] = []): Promise<AgentMessage[]> {
    const responses: AgentMessage[] = [];
    const agents = this.getAgents().filter(a => !excludeIds.includes(a.id));
    
    const broadcastMsg: AgentMessage = {
      from: "memphis",
      to: "broadcast",
      content,
      timestamp: Date.now(),
      type: "broadcast",
    };
    
    this.messages.push(broadcastMsg);
    this.addMemory(`Broadcast: ${content.substring(0, 30)}... to ${agents.length} agents`);
    
    for (const agent of agents) {
      if (this.defaultLLM) {
        const response = await this.getLLMResponse(agent.id, content, agent.provider, agent.model);
        responses.push(response);
      } else {
        const response = await this.simulateResponse(agent.id, content);
        responses.push(response);
      }
    }
    
    return responses;
  }

  // Task queue management
  createTask(agentId: string, task: string): Task {
    const taskObj: Task = {
      id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      agentId,
      task,
      status: "pending",
      createdAt: Date.now(),
    };
    
    this.tasks.set(taskObj.id, taskObj);
    this.addMemory(`Task created for ${agentId}: ${task.substring(0, 30)}...`);
    
    return taskObj;
  }

  async executeTask(taskId: string): Promise<Task> {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error("Task not found");
    }
    
    task.status = "running";
    this.updateAgentState(task.agentId, "status", "active");
    
    try {
      const response = await this.sendMessage(task.agentId, task.task);
      task.status = "completed";
      task.result = response.content;
      task.completedAt = Date.now();
    } catch (error) {
      task.status = "failed";
      task.result = `Error: ${error}`;
      task.completedAt = Date.now();
    }
    
    this.updateAgentState(task.agentId, "status", "idle");
    return task;
  }

  // Collaborative task - multi-agent task execution
  async createCollaborativeTask(description: string, leadAgentId: string): Promise<CollaborativeTask> {
    const task: CollaborativeTask = {
      id: `collab-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      description,
      subtasks: [],
      status: "pending",
      leadAgent: leadAgentId,
      results: new Map(),
      createdAt: Date.now(),
    };
    
    this.collaborativeTasks.set(task.id, task);
    this.addMemory(`Collaborative task created: ${description.substring(0, 30)}...`);
    
    return task;
  }

  // Delegate subtasks to agents based on capabilities
  async delegateSubtasks(taskId: string, taskDescriptions: Map<string, string>): Promise<CollaborativeTask> {
    const task = this.collaborativeTasks.get(taskId);
    if (!task) {
      throw new Error("Collaborative task not found");
    }
    
    task.status = "delegating";
    
    for (const [agentId, description] of taskDescriptions) {
      const agent = this.knownAgents.get(agentId);
      if (!agent) continue;
      
      const subtask: SubTask = {
        id: `subtask-${task.id}-${task.subtasks.length}`,
        agentId,
        description,
        status: "assigned",
      };
      
      task.subtasks.push(subtask);
    }
    
    this.addMemory(`Delegated ${task.subtasks.length} subtasks for collaborative task ${task.id}`);
    return task;
  }

  // Execute all subtasks in parallel and aggregate results
  async executeCollaborativeTask(taskId: string): Promise<CollaborativeTask> {
    const task = this.collaborativeTasks.get(taskId);
    if (!task) {
      throw new Error("Collaborative task not found");
    }
    
    task.status = "running";
    
    // Execute all subtasks in parallel
    const subtaskPromises = task.subtasks.map(async (subtask) => {
      try {
        if (this.defaultLLM) {
          const response = await this.getLLMResponse(subtask.agentId, subtask.description);
          subtask.result = response.content;
          subtask.status = "completed";
          task.results.set(subtask.agentId, response.content);
        } else {
          const response = await this.simulateResponse(subtask.agentId, subtask.description);
          subtask.result = response.content;
          subtask.status = "completed";
          task.results.set(subtask.agentId, response.content);
        }
      } catch (error) {
        subtask.status = "failed";
        subtask.result = `Error: ${error}`;
      }
    });
    
    await Promise.all(subtaskPromises);
    
    // Aggregate results
    task.status = "aggregating";
    const aggregatedResults = Array.from(task.results.entries())
      .map(([agentId, result]) => {
        const agent = this.knownAgents.get(agentId);
        return `${agent?.name || agentId}: ${result}`;
      })
      .join("\n\n");
    
    // Store aggregated results
    await this.store.appendBlock("journal", {
      type: "journal",
      content: `[OpenClaw] Collaborative task ${task.id} results:\n${aggregatedResults}`,
      tags: ["agent", "openclaw", "collaboration"],
    });
    
    task.status = "completed";
    task.completedAt = Date.now();
    
    return task;
  }

  getCollaborativeTask(taskId: string): CollaborativeTask | undefined {
    return this.collaborativeTasks.get(taskId);
  }

  getTask(taskId: string): Task | undefined {
    return this.tasks.get(taskId);
  }

  getTasks(agentId?: string): Task[] {
    const allTasks = Array.from(this.tasks.values());
    if (agentId) {
      return allTasks.filter(t => t.agentId === agentId);
    }
    return allTasks;
  }

  // Agent state management
  private updateAgentState(agentId: string, field: keyof AgentState, value?: any): void {
    const state = this.agentStates.get(agentId);
    if (state) {
      if (field === "messagesSent") {
        state.messagesSent++;
      } else if (field === "messagesReceived") {
        state.messagesReceived++;
      } else if (field === "computeShare") {
        state.computeShare = value;
      } else if (field === "status") {
        state.status = value;
      }
      state.lastActive = Date.now();
      this.persistAgentStates();
    }
  }

  getAgentState(agentId: string): AgentState | undefined {
    return this.agentStates.get(agentId);
  }

  getAllAgentStates(): AgentState[] {
    return Array.from(this.agentStates.values());
  }

  // Persistence - Fixed to actually parse and load states
  private persistAgentStates(): void { // fire-and-forget internally
    try {
      const states = Array.from(this.agentStates.values());
      const stateData = states.map(s => ({
        id: s.agentId,
        share: s.computeShare,
        status: s.status,
        lastActive: s.lastActive,
        sent: s.messagesSent,
        received: s.messagesReceived,
      }));
      
      this.store.appendBlock("journal", {
        type: "journal",
        content: `[OpenClaw] Agent states: ${JSON.stringify(stateData)}`,
        tags: ["agent", "openclaw", "state", "persist"],
      }).catch(() => {});
    } catch (error) {
      console.error("Failed to persist agent states:", error);
    }
  }

  private loadAgentStates(): void {
    const blocks = this.store.readChain("journal");
    const stateBlocks = blocks
      .filter(b => b.data.tags?.includes("openclaw") && b.data.tags?.includes("persist"))
      .slice(-10); // Get last 10 state blocks
    
    for (const block of stateBlocks) {
      try {
        // Extract JSON from content
        const content = block.data.content;
        const jsonMatch = content.match(/Agent states: (.+)/);
        if (jsonMatch) {
          const states = JSON.parse(jsonMatch[1]);
          for (const state of states) {
            const existingState = this.agentStates.get(state.id);
            if (existingState) {
              // Update with persisted values
              existingState.computeShare = state.share;
              existingState.status = state.status;
              existingState.lastActive = state.lastActive;
              existingState.messagesSent = state.sent;
              existingState.messagesReceived = state.received;
            }
          }
          console.log("📦 Loaded agent states from chain");
        }
      } catch (error) {
        // Ignore parsing errors
      }
    }
  }

  // Get recent messages from memory chain for context
  getMemoryContext(limit: number = 5): string[] {
    const blocks = this.store.readChain("journal");
    const recentBlocks = blocks.slice(-limit);
    return recentBlocks.map(b => b.data.content);
  }

  // Request agent to perform a task
  async requestTask(agentId: string, task: string, context?: string): Promise<AgentMessage> {
    const agent = this.knownAgents.get(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }

    const memoryContext = this.getMemoryContext(3).join("\n");
    const fullTask = context 
      ? `${task}\n\nContext from memory:\n${memoryContext}`
      : task;

    return this.sendMessage(agentId, fullTask);
  }

  getMessages(): AgentMessage[] {
    return this.messages;
  }

  // Clear message history
  clearMessages(): void {
    this.messages = [];
    this.addMemory("Message history cleared");
  }

  // Get agent by capability
  findAgentsByCapability(capability: string): Agent[] {
    return Array.from(this.knownAgents.values())
      .filter(agent => agent.capabilities.includes(capability));
  }

  // Find available agents (idle or active)
  findAvailableAgents(): Agent[] {
    return Array.from(this.knownAgents.values())
      .filter(agent => agent.status !== "connecting");
  }

  getStatus(): string {
    const agents = this.getAgents();
    const active = agents.filter(a => a.status === "active").length;
    const llmStatus = this.getLLMStatus();
    const providers = llmStatus.providers.join(", ") || "none";
    const collabTasks = Array.from(this.collaborativeTasks.values()).filter(t => t.status !== "completed").length;
    
    return `
╔══════════════════════════════════════════╗
║      🦞 OpenClaw Bridge Status           ║
╠══════════════════════════════════════════╣
║  Connected Agents: ${agents.length}                    
║  Active: ${active}                            
║  Messages: ${this.messages.length}                       
║  Tasks: ${this.tasks.size} | Collab: ${collabTasks}           
╠══════════════════════════════════════════╣
║  LLM Provider: ${llmStatus.provider.padEnd(22)}║  Available: ${providers.padEnd(24)}║  Status: ${llmStatus.available ? "✅ Active" : "⚠️  Simulation".padEnd(20)}╠══════════════════════════════════════════╣
║  Known Agents:                             
${agents.map(a => `║    • ${a.name.padEnd(20)} ${a.computeShare}% CPU`).join("\n")}
╚══════════════════════════════════════════╝
    `.trim();
  }
}

// CLI commands for agent management

// CLI commands — see openclaw-commands.ts
export { runOpenClawCommands } from "./openclaw-commands.js";
