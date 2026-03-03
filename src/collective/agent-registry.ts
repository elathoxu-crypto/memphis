/**
 * Memphis Model D: Agent Registry
 * 
 * Manages registered agents, their capabilities, roles, and status.
 * 
 * @version 1.0.0
 * @date 2026-03-03
 */

import type {
  Agent,
  AgentRole,
  AgentConfig,
  ReputationScore
} from './types.js';

/**
 * Agent Registry - manages participating agents
 */
export class AgentRegistry {
  private agents: Map<string, Agent>;
  private roleIndex: Map<AgentRole, Set<string>>;

  constructor() {
    this.agents = new Map();
    this.roleIndex = new Map();
    
    // Initialize role index
    const roles: AgentRole[] = ['security', 'performance', 'ux', 'architecture', 'testing', 'general'];
    for (const role of roles) {
      this.roleIndex.set(role, new Set());
    }
  }

  /**
   * Register new agent
   */
  register(
    id: string,
    name: string,
    role: AgentRole,
    capabilities: string[],
    config?: Partial<AgentConfig>
  ): Agent {
    // Check if already registered
    if (this.agents.has(id)) {
      throw new Error(`Agent ${id} already registered`);
    }

    const agent: Agent = {
      id,
      name,
      role,
      description: `${role} agent: ${name}`,
      capabilities,
      reputation: this.createInitialReputation(),
      config: {
        votingMethod: config?.votingMethod || 'simple_majority',
        minConfidence: config?.minConfidence || 0.5,
        delegateTo: config?.delegateTo,
        responseTimeout: config?.responseTimeout || 5000,
        maxLoad: config?.maxLoad || 3,
        ...config
      },
      active: true,
      createdAt: new Date()
    };

    // Add to registry
    this.agents.set(id, agent);
    
    // Add to role index
    const roleSet = this.roleIndex.get(role);
    if (roleSet) {
      roleSet.add(id);
    }

    return agent;
  }

  /**
   * Unregister agent
   */
  unregister(agentId: string): boolean {
    const agent = this.agents.get(agentId);
    if (!agent) return false;

    // Remove from main registry
    this.agents.delete(agentId);

    // Remove from role index
    const roleSet = this.roleIndex.get(agent.role);
    if (roleSet) {
      roleSet.delete(agentId);
    }

    return true;
  }

  /**
   * Get agent by ID
   */
  getAgent(agentId: string): Agent | undefined {
    return this.agents.get(agentId);
  }

  /**
   * Get all active agents
   */
  getActiveAgents(): Agent[] {
    return Array.from(this.agents.values()).filter(agent => agent.active);
  }

  /**
   * Get agents by role
   */
  getAgentsByRole(role: AgentRole): Agent[] {
    const agentIds = this.roleIndex.get(role);
    if (!agentIds) return [];

    return Array.from(agentIds)
      .map(id => this.agents.get(id))
      .filter((agent): agent is Agent => agent !== undefined && agent.active);
  }

  /**
   * Get agents by capability
   */
  getAgentsByCapability(capability: string): Agent[] {
    return Array.from(this.agents.values())
      .filter(agent => agent.active && agent.capabilities.includes(capability));
  }

  /**
   * Update agent status
   */
  setAgentStatus(agentId: string, active: boolean): boolean {
    const agent = this.agents.get(agentId);
    if (!agent) return false;

    agent.active = active;
    return true;
  }

  /**
   * Update agent reputation
   */
  updateAgentReputation(agentId: string, reputation: ReputationScore): boolean {
    const agent = this.agents.get(agentId);
    if (!agent) return false;

    agent.reputation = reputation;
    return true;
  }

  /**
   * Delegate to another agent
   */
  delegate(from: string, to: string): boolean {
    const fromAgent = this.agents.get(from);
    const toAgent = this.agents.get(to);

    if (!fromAgent || !toAgent) return false;
    if (!toAgent.active) return false;

    fromAgent.config.delegateTo = to;
    return true;
  }

  /**
   * Get agent statistics
   */
  getStats(): {
    total: number;
    active: number;
    byRole: Map<AgentRole, number>;
    byCapability: Map<string, number>;
  } {
    const active = this.getActiveAgents();
    
    const byRole = new Map<AgentRole, number>();
    for (const [role, agentIds] of this.roleIndex) {
      const count = Array.from(agentIds)
        .filter(id => {
          const agent = this.agents.get(id);
          return agent && agent.active;
        }).length;
      byRole.set(role, count);
    }

    const byCapability = new Map<string, number>();
    for (const agent of active) {
      for (const capability of agent.capabilities) {
        const current = byCapability.get(capability) || 0;
        byCapability.set(capability, current + 1);
      }
    }

    return {
      total: this.agents.size,
      active: active.length,
      byRole,
      byCapability
    };
  }

  /**
   * Find best agent for task
   */
  findBestAgent(role: AgentRole, capability?: string): Agent | undefined {
    let candidates = this.getAgentsByRole(role);
    
    if (capability) {
      candidates = candidates.filter(agent => agent.capabilities.includes(capability));
    }

    if (candidates.length === 0) return undefined;

    // Sort by reputation (highest first)
    candidates.sort((a, b) => b.reputation.overall - a.reputation.overall);

    return candidates[0];
  }

  /**
   * Export registry data
   */
  export(): Agent[] {
    return Array.from(this.agents.values());
  }

  /**
   * Import registry data
   */
  import(agents: Agent[]): void {
    this.agents.clear();
    
    // Clear role index
    for (const agentIds of this.roleIndex.values()) {
      agentIds.clear();
    }

    // Import agents
    for (const agent of agents) {
      this.agents.set(agent.id, agent);
      
      const roleSet = this.roleIndex.get(agent.role);
      if (roleSet) {
        roleSet.add(agent.id);
      }
    }
  }

  /**
   * Create initial reputation score
   */
  private createInitialReputation(): ReputationScore {
    return {
      overall: 0.5,
      domains: new Map(),
      accuracy: 0.5,
      participation: 1.0,
      alignment: 1.0,
      reliability: 1.0,
      updatedAt: new Date(),
      history: []
    };
  }
}
