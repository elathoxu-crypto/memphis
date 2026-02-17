import type { Provider } from "../providers/index.js";
export interface Agent {
    id: string;
    name: string;
    did: string;
    computeShare: number;
    status: "active" | "idle" | "connecting";
    capabilities: string[];
    model?: string;
    provider?: string;
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
export declare class OpenClawBridge {
    private store;
    private config;
    private knownAgents;
    private messages;
    private tasks;
    private collaborativeTasks;
    private agentStates;
    private llms;
    private defaultLLM;
    constructor();
    private initLLMs;
    getLLMStatus(): {
        available: boolean;
        provider: string;
        model?: string;
        providers: string[];
    };
    getProvider(name: string): Provider | undefined;
    registerAgent(agent: Agent): void;
    getAgents(): Agent[];
    getAgent(id: string): Agent | undefined;
    sendMessage(to: string, content: string): Promise<AgentMessage>;
    private getLLMResponse;
    private simulateResponse;
    private generateAgentResponse;
    private addMemory;
    negotiateComputeShare(agentId: string, requestedShare: number): NegotiateResult;
    sendMessageBetweenAgents(fromId: string, toId: string, content: string): Promise<AgentMessage>;
    broadcastToAgents(content: string, excludeIds?: string[]): Promise<AgentMessage[]>;
    createTask(agentId: string, task: string): Task;
    executeTask(taskId: string): Promise<Task>;
    createCollaborativeTask(description: string, leadAgentId: string): Promise<CollaborativeTask>;
    delegateSubtasks(taskId: string, taskDescriptions: Map<string, string>): Promise<CollaborativeTask>;
    executeCollaborativeTask(taskId: string): Promise<CollaborativeTask>;
    getCollaborativeTask(taskId: string): CollaborativeTask | undefined;
    getTask(taskId: string): Task | undefined;
    getTasks(agentId?: string): Task[];
    private updateAgentState;
    getAgentState(agentId: string): AgentState | undefined;
    getAllAgentStates(): AgentState[];
    private persistAgentStates;
    private loadAgentStates;
    getMemoryContext(limit?: number): string[];
    requestTask(agentId: string, task: string, context?: string): Promise<AgentMessage>;
    getMessages(): AgentMessage[];
    clearMessages(): void;
    findAgentsByCapability(capability: string): Agent[];
    findAvailableAgents(): Agent[];
    getStatus(): string;
}
export declare function runOpenClawCommands(args: string[]): void;
