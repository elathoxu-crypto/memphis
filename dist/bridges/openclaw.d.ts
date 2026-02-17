export interface Agent {
    id: string;
    name: string;
    did: string;
    computeShare: number;
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
export declare class OpenClawBridge {
    private store;
    private config;
    private knownAgents;
    private messages;
    private llm;
    private useLLM;
    constructor();
    private initLLM;
    getLLMStatus(): {
        available: boolean;
        provider: string;
        model?: string;
    };
    registerAgent(agent: Agent): void;
    getAgents(): Agent[];
    getAgent(id: string): Agent | undefined;
    sendMessage(to: string, content: string): Promise<AgentMessage>;
    private simulateResponse;
    private generateAgentResponse;
    private addMemory;
    negotiateComputeShare(agentId: string, requestedShare: number): boolean;
    getMessages(): AgentMessage[];
    getStatus(): string;
}
export declare function runOpenClawCommands(args: string[]): void;
