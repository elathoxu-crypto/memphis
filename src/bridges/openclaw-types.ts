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
