import type { Agent, AgentState, NegotiateResult } from "./openclaw-types.js";
import { Store } from "../memory/store.js";

export class OpenClawAgentRegistry {
  private knownAgents: Map<string, Agent> = new Map();
  private agentStates: Map<string, AgentState> = new Map();

  constructor(private readonly store: Store, private readonly addMemory: (content: string) => void) {}

  getAgents(): Agent[] {
    return Array.from(this.knownAgents.values());
  }

  getAgent(agentId: string): Agent | undefined {
    return this.knownAgents.get(agentId);
  }

  getKnownAgentsMap(): Map<string, Agent> {
    return this.knownAgents;
  }

  addAgent(agent: Agent): void {
    this.knownAgents.set(agent.id, agent);
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

  findAgentsByCapability(capability: string): Agent[] {
    return this.getAgents().filter(agent => agent.capabilities.includes(capability));
  }

  findAvailableAgents(): Agent[] {
    return this.getAgents().filter(agent => agent.status !== "connecting");
  }

  negotiateComputeShare(agentId: string, requestedShare: number): NegotiateResult {
    const agent = this.knownAgents.get(agentId);
    if (!agent) {
      return { success: false, message: "Agent not found" };
    }

    const maxShare = 80;
    const minShare = 5;

    if (requestedShare < minShare) {
      return { success: false, message: `Minimum compute share is ${minShare}%` };
    }
    if (requestedShare > maxShare) {
      requestedShare = maxShare;
    }

    if (requestedShare <= 50) {
      agent.computeShare = requestedShare;
      this.updateAgentState(agentId, "computeShare", requestedShare);
      this.addMemory(`${agent.name} compute share set to ${requestedShare}%`);
      return { success: true, agreed: requestedShare, message: `Accepted: ${requestedShare}% compute share` };
    }

    const offered = Math.floor(requestedShare * 0.7);
    const finalOffer = Math.max(offered, minShare);
    agent.computeShare = finalOffer;
    this.updateAgentState(agentId, "computeShare", finalOffer);

    this.addMemory(`Negotiated compute share: ${finalOffer}% (from ${requestedShare}%)`);
    return {
      success: true,
      agreed: finalOffer,
      message: `Negotiated: ${finalOffer}% (from ${requestedShare}%)`,
    };
  }

  updateAgentState(agentId: string, field: keyof AgentState, value?: number | string): void {
    const state = this.agentStates.get(agentId);
    if (!state) return;

    if (field === "messagesSent") {
      state.messagesSent++;
    } else if (field === "messagesReceived") {
      state.messagesReceived++;
    } else if (field === "computeShare" && typeof value === "number") {
      state.computeShare = value;
    } else if (field === "status" && typeof value === "string") {
      state.status = value as AgentState["status"];
    }

    state.lastActive = Date.now();
    this.persistAgentStates();
  }

  getAgentState(agentId: string): AgentState | undefined {
    return this.agentStates.get(agentId);
  }

  getAllAgentStates(): AgentState[] {
    return Array.from(this.agentStates.values());
  }

  persistAgentStates(): void {
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

      this.store
        .appendBlock("journal", {
          type: "journal",
          content: `[OpenClaw] Agent states: ${JSON.stringify(stateData)}`,
          tags: ["agent", "openclaw", "state", "persist"],
        })
        .catch(() => {});
    } catch (error) {
      console.error("Failed to persist agent states:", error);
    }
  }

  loadAgentStates(): void {
    const blocks = this.store.readChain("journal");
    const stateBlocks = blocks.filter(b => b.data.tags?.includes("openclaw") && b.data.tags?.includes("persist")).slice(-10);

    for (const block of stateBlocks) {
      try {
        const content = block.data.content;
        const jsonMatch = content.match(/Agent states: (.+)/);
        if (!jsonMatch) continue;

        const states = JSON.parse(jsonMatch[1]);
        for (const state of states) {
          const existingState = this.agentStates.get(state.id);
          if (existingState) {
            existingState.computeShare = state.share;
            existingState.status = state.status;
            existingState.lastActive = state.lastActive;
            existingState.messagesSent = state.sent;
            existingState.messagesReceived = state.received;
          }
        }
        console.log("📦 Loaded agent states from chain");
      } catch {
        // Ignore parsing errors
      }
    }
  }
}
