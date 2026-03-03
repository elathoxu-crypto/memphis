/**
 * Memphis Model D: Collective Memory
 * 
 * Shared knowledge pool for multi-agent knowledge aggregation.
 * 
 * @version 1.0.0
 * @date 2026-03-03
 */

import type { CollectiveMemory } from './types.js';

/**
 * Collective Memory Manager - shared knowledge pool
 */
export class CollectiveMemoryManager {
  private memories: Map<string, CollectiveMemory>;
  private topicIndex: Map<string, Set<string>>;

  constructor() {
    this.memories = new Map();
    this.topicIndex = new Map();
  }

  /**
   * Add collective memory
   */
  addMemory(
    topic: string,
    content: string,
    contributors: string[],
    agreement: number = 0.5
  ): CollectiveMemory {
    const id = this.generateId();
    
    const memory: CollectiveMemory = {
      id,
      topic,
      content,
      contributors,
      agreement,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.memories.set(id, memory);
    this.addToTopicIndex(topic, id);

    return memory;
  }

  /**
   * Get memory by ID
   */
  getMemory(memoryId: string): CollectiveMemory | undefined {
    return this.memories.get(memoryId);
  }

  /**
   * Get memories by topic
   */
  getMemoriesByTopic(topic: string): CollectiveMemory[] {
    const memoryIds = this.topicIndex.get(topic);
    if (!memoryIds) return [];

    return Array.from(memoryIds)
      .map(id => this.memories.get(id))
      .filter((memory): memory is CollectiveMemory => memory !== undefined);
  }

  /**
   * Update memory content
   */
  updateMemory(
    memoryId: string,
    content: string,
    contributor: string
  ): boolean {
    const memory = this.memories.get(memoryId);
    if (!memory) return false;

    memory.content = content;
    memory.updatedAt = new Date();
    
    // Add contributor if not already present
    if (!memory.contributors.includes(contributor)) {
      memory.contributors.push(contributor);
    }

    return true;
  }

  /**
   * Update agreement level
   */
  updateAgreement(memoryId: string, agreement: number): boolean {
    const memory = this.memories.get(memoryId);
    if (!memory) return false;

    memory.agreement = Math.max(0, Math.min(1, agreement));
    memory.updatedAt = new Date();

    return true;
  }

  /**
   * Aggregate knowledge from multiple agents
   */
  aggregateKnowledge(
    topic: string,
    contributions: Array<{ agentId: string; content: string }>
  ): CollectiveMemory {
    // Merge contributions
    const mergedContent = contributions.map(c => c.content).join('\n\n');
    const contributors = contributions.map(c => c.agentId);

    // Calculate agreement (how similar are contributions?)
    const agreement = this.calculateAgreement(contributions);

    return this.addMemory(topic, mergedContent, contributors, agreement);
  }

  /**
   * Search memories by content
   */
  search(query: string, limit: number = 10): CollectiveMemory[] {
    const results: Array<{ memory: CollectiveMemory; score: number }> = [];

    for (const memory of this.memories.values()) {
      const score = this.calculateRelevance(memory, query);
      if (score > 0) {
        results.push({ memory, score });
      }
    }

    // Sort by relevance (highest first)
    results.sort((a, b) => b.score - a.score);

    return results.slice(0, limit).map(r => r.memory);
  }

  /**
   * Get high-agreement memories
   */
  getHighAgreementMemories(threshold: number = 0.8): CollectiveMemory[] {
    return Array.from(this.memories.values())
      .filter(memory => memory.agreement >= threshold)
      .sort((a, b) => b.agreement - a.agreement);
  }

  /**
   * Get memories by contributor
   */
  getMemoriesByContributor(agentId: string): CollectiveMemory[] {
    return Array.from(this.memories.values())
      .filter(memory => memory.contributors.includes(agentId));
  }

  /**
   * Get memory statistics
   */
  getStats(): {
    total: number;
    byTopic: Map<string, number>;
    averageAgreement: number;
    topContributors: Array<{ agentId: string; count: number }>;
  } {
    const byTopic = new Map<string, number>();
    const contributorCounts = new Map<string, number>();

    let totalAgreement = 0;

    for (const memory of this.memories.values()) {
      // Count by topic
      const current = byTopic.get(memory.topic) || 0;
      byTopic.set(memory.topic, current + 1);

      // Sum agreement
      totalAgreement += memory.agreement;

      // Count contributors
      for (const contributor of memory.contributors) {
        const count = contributorCounts.get(contributor) || 0;
        contributorCounts.set(contributor, count + 1);
      }
    }

    // Get top contributors
    const topContributors = Array.from(contributorCounts.entries())
      .map(([agentId, count]) => ({ agentId, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      total: this.memories.size,
      byTopic,
      averageAgreement: this.memories.size > 0 ? totalAgreement / this.memories.size : 0,
      topContributors
    };
  }

  /**
   * Export memories
   */
  export(): CollectiveMemory[] {
    return Array.from(this.memories.values());
  }

  /**
   * Import memories
   */
  import(memories: CollectiveMemory[]): void {
    this.memories.clear();
    this.topicIndex.clear();

    for (const memory of memories) {
      this.memories.set(memory.id, memory);
      this.addToTopicIndex(memory.topic, memory.id);
    }
  }

  // ==================== Private Helpers ====================

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `mem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Add to topic index
   */
  private addToTopicIndex(topic: string, memoryId: string): void {
    if (!this.topicIndex.has(topic)) {
      this.topicIndex.set(topic, new Set());
    }
    this.topicIndex.get(topic)!.add(memoryId);
  }

  /**
   * Calculate agreement between contributions
   */
  private calculateAgreement(
    contributions: Array<{ agentId: string; content: string }>
  ): number {
    if (contributions.length <= 1) return 1.0;

    // Simplified: check for overlapping keywords
    const allKeywords = contributions.map(c => this.extractKeywords(c.content));
    
    let totalOverlap = 0;
    let comparisons = 0;

    for (let i = 0; i < allKeywords.length; i++) {
      for (let j = i + 1; j < allKeywords.length; j++) {
        const overlap = this.calculateOverlap(allKeywords[i], allKeywords[j]);
        totalOverlap += overlap;
        comparisons++;
      }
    }

    return comparisons > 0 ? totalOverlap / comparisons : 1.0;
  }

  /**
   * Extract keywords from content
   */
  private extractKeywords(content: string): Set<string> {
    // Simplified keyword extraction
    const words = content.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 3);

    return new Set(words);
  }

  /**
   * Calculate overlap between two sets
   */
  private calculateOverlap(set1: Set<string>, set2: Set<string>): number {
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    
    return union.size > 0 ? intersection.size / union.size : 0;
  }

  /**
   * Calculate relevance score
   */
  private calculateRelevance(memory: CollectiveMemory, query: string): number {
    const queryLower = query.toLowerCase();
    const contentLower = memory.content.toLowerCase();
    const topicLower = memory.topic.toLowerCase();

    let score = 0;

    // Topic match (highest weight)
    if (topicLower.includes(queryLower)) {
      score += 0.5;
    }

    // Content match
    if (contentLower.includes(queryLower)) {
      score += 0.3;
    }

    // Agreement boost
    score += memory.agreement * 0.2;

    return score;
  }
}
