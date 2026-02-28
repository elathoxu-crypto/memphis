// OpenClaw Bridge - Agent Integration
// Collaboration with external AI agents using multiple LLM providers

import { Store } from "../memory/store.js";
import { loadConfig } from "../config/loader.js";
import type { Provider } from "../providers/index.js";
import type { Agent, AgentMessage, AgentState, CollaborativeTask, NegotiateResult, Task } from "./openclaw-types.js";
import { OpenClawLLMRouter } from "./openclaw-llm.js";
import { OpenClawAgentRegistry } from "./openclaw-agents.js";
import { OpenClawTaskManager } from "./openclaw-tasks.js";

// Singleton bridge instance for state persistence
let bridgeInstance: OpenClawBridge | null = null;

export class OpenClawBridge {
  private store!: Store;
  private config!: ReturnType<typeof loadConfig>;
  private messages: AgentMessage[] = [];
  private llmRouter!: OpenClawLLMRouter;
  private agentRegistry!: OpenClawAgentRegistry;
  private taskManager!: OpenClawTaskManager;

  constructor() {
    if (bridgeInstance) {
      return bridgeInstance;
    }

    this.config = loadConfig();
    this.store = new Store(this.config.memory?.path || `${process.env.HOME}/.memphis/chains`);

    this.agentRegistry = new OpenClawAgentRegistry(this.store, content => this.addMemory(content));
    this.llmRouter = new OpenClawLLMRouter({
      addMemory: content => this.addMemory(content),
      getAgent: agentId => this.agentRegistry.getAgent(agentId),
      pushMessage: message => this.messages.push(message),
    });
    this.taskManager = new OpenClawTaskManager({
      addMemory: content => this.addMemory(content),
      sendMessage: (agentId, task) => this.sendMessage(agentId, task),
      agentRegistry: this.agentRegistry,
      llmRouter: this.llmRouter,
      store: this.store,
    });

    this.llmRouter.initLLMs();
    this.registerDefaultAgents();
    this.agentRegistry.loadAgentStates();

    bridgeInstance = this;
  }

  private registerDefaultAgents(): void {
    this.agentRegistry.addAgent({
      id: "openclaw-001",
      name: "OpenClaw",
      did: "did:openclaw:7a3b9c2d1e4f5678901234567890abcd",
      computeShare: 53,
      status: "active",
      capabilities: ["code-analysis", "file-operations", "web-search", "coordination"],
      model: "llama3",
      provider: "ollama",
    });

    this.agentRegistry.addAgent({
      id: "openclaw-002",
      name: "CodeMaster",
      did: "did:openclaw:8b4c0d3e5f6a78901234567890bcde",
      computeShare: 25,
      status: "idle",
      capabilities: ["code-review", "refactoring", "bug-detection"],
      model: "llama3",
      provider: "ollama",
    });

    this.agentRegistry.addAgent({
      id: "openclaw-003",
      name: "DataSage",
      did: "did:openclaw:9c5d1e4f6a7b890123456789012cdef",
      computeShare: 15,
      status: "idle",
      capabilities: ["data-analysis", "visualization", "statistics"],
      model: "llama3",
      provider: "ollama",
    });

    this.agentRegistry.addAgent({
      id: "openclaw-004",
      name: "ResearchBot",
      did: "did:openclaw:0d6e2f5a7b8c901234567890123def0",
      computeShare: 7,
      status: "idle",
      capabilities: ["research", "documentation", "web-search", "summarization"],
      model: "llama3",
      provider: "ollama",
    });
  }

  private addMemory(content: string): void {
    this.store
      .appendBlock("journal", {
        type: "journal",
        content: `[OpenClaw] ${content}`,
        tags: ["agent", "openclaw", "integration"],
      })
      .catch(() => {});
  }

  getLLMStatus(): { available: boolean; provider: string; model?: string; providers: string[] } {
    return this.llmRouter.getLLMStatus();
  }

  getProvider(name: string): Provider | undefined {
    return this.llmRouter.getProvider(name);
  }

  registerAgent(agent: Agent): void {
    this.agentRegistry.addAgent(agent);
  }

  getAgents(): Agent[] {
    return this.agentRegistry.getAgents();
  }

  getAgent(id: string): Agent | undefined {
    return this.agentRegistry.getAgent(id);
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
    this.agentRegistry.updateAgentState(to, "messagesReceived");
    this.addMemory(`Message sent to ${to}: ${content.substring(0, 50)}...`);

    const agent = this.agentRegistry.getAgent(to);
    let response: AgentMessage;
    if (agent && this.llmRouter.hasAvailableLLM()) {
      response = await this.llmRouter.getLLMResponse(to, content, agent.provider, agent.model);
    } else {
      response = await this.llmRouter.simulateResponse(to, content);
    }

    this.agentRegistry.updateAgentState(to, "messagesSent");
    return response;
  }

  async sendMessageBetweenAgents(fromId: string, toId: string, content: string): Promise<AgentMessage> {
    const fromAgent = this.agentRegistry.getAgent(fromId);
    const toAgent = this.agentRegistry.getAgent(toId);

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

    let response: AgentMessage;
    if (this.llmRouter.hasAvailableLLM()) {
      response = await this.llmRouter.getLLMResponse(toId, content, toAgent.provider, toAgent.model);
    } else {
      response = await this.llmRouter.simulateResponse(toId, content);
    }

    return response;
  }

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
      if (this.llmRouter.hasAvailableLLM()) {
        const response = await this.llmRouter.getLLMResponse(agent.id, content, agent.provider, agent.model);
        responses.push(response);
      } else {
        const response = await this.llmRouter.simulateResponse(agent.id, content);
        responses.push(response);
      }
    }

    return responses;
  }

  createTask(agentId: string, task: string): Task {
    return this.taskManager.createTask(agentId, task);
  }

  executeTask(taskId: string): Promise<Task> {
    return this.taskManager.executeTask(taskId);
  }

  createCollaborativeTask(description: string, leadAgentId: string): Promise<CollaborativeTask> {
    return this.taskManager.createCollaborativeTask(description, leadAgentId);
  }

  delegateSubtasks(taskId: string, taskDescriptions: Map<string, string>): Promise<CollaborativeTask> {
    return this.taskManager.delegateSubtasks(taskId, taskDescriptions);
  }

  executeCollaborativeTask(taskId: string): Promise<CollaborativeTask> {
    return this.taskManager.executeCollaborativeTask(taskId);
  }

  getCollaborativeTask(taskId: string): CollaborativeTask | undefined {
    return this.taskManager.getCollaborativeTask(taskId);
  }

  getTask(taskId: string): Task | undefined {
    return this.taskManager.getTask(taskId);
  }

  getTasks(agentId?: string): Task[] {
    return this.taskManager.getTasks(agentId);
  }

  getMessages(): AgentMessage[] {
    return this.messages;
  }

  clearMessages(): void {
    this.messages = [];
    this.addMemory("Message history cleared");
  }

  findAgentsByCapability(capability: string): Agent[] {
    return this.agentRegistry.findAgentsByCapability(capability);
  }

  findAvailableAgents(): Agent[] {
    return this.agentRegistry.findAvailableAgents();
  }

  negotiateComputeShare(agentId: string, requestedShare: number): NegotiateResult {
    return this.agentRegistry.negotiateComputeShare(agentId, requestedShare);
  }

  getAgentState(agentId: string): AgentState | undefined {
    return this.agentRegistry.getAgentState(agentId);
  }

  getAllAgentStates(): AgentState[] {
    return this.agentRegistry.getAllAgentStates();
  }

  getMemoryContext(limit: number = 5): string[] {
    const blocks = this.store.readChain("journal");
    const recentBlocks = blocks.slice(-limit);
    return recentBlocks.map(b => b.data.content);
  }

  async requestTask(agentId: string, task: string, context?: string): Promise<AgentMessage> {
    const agent = this.agentRegistry.getAgent(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }

    const memoryContext = this.getMemoryContext(3).join("\n");
    const fullTask = context ? `${task}\n\nContext from memory:\n${memoryContext}` : task;

    return this.sendMessage(agentId, fullTask);
  }

  getStatus(): string {
    const agents = this.getAgents();
    const active = agents.filter(a => a.status === "active").length;
    const llmStatus = this.getLLMStatus();
    const providers = llmStatus.providers.join(", ") || "none";
    const collabTasks = this.taskManager.getCollaborativeTasks().filter(t => t.status !== "completed").length;

    return `
╔══════════════════════════════════════════╗
║      🦞 OpenClaw Bridge Status           ║
╠══════════════════════════════════════════╣
║  Connected Agents: ${agents.length}                    
║  Active: ${active}                            
║  Messages: ${this.messages.length}                       
║  Tasks: ${this.taskManager.getTasks().length} | Collab: ${collabTasks}           
╠══════════════════════════════════════════╣
║  LLM Provider: ${llmStatus.provider.padEnd(22)}║  Available: ${providers.padEnd(24)}║  Status: ${llmStatus.available ? "✅ Active" : "⚠️  Simulation".padEnd(20)}╠══════════════════════════════════════════╣
║  Known Agents:                             
${agents.map(a => `║    • ${a.name.padEnd(20)} ${a.computeShare}% CPU`).join("\n")}
╚══════════════════════════════════════════╝
    `.trim();
  }
}

export type {
  Agent,
  AgentMessage,
  AgentState,
  CollaborativeTask,
  NegotiateResult,
  SubTask,
  Task,
} from "./openclaw-types.js";

// CLI commands — see openclaw-commands.ts
export { runOpenClawCommands } from "./openclaw-commands.js";
