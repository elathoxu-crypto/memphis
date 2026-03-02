/**
 * Decision Lifecycle Management
 * 
 * Track state changes: revise, contradict, reinforce
 */

import { log } from "../utils/logger.js";
import { createDecisionV1 } from "./schema.js";
import { createWorkspaceStore } from "../cli/utils/workspace-store.js";

export interface ReviseOptions {
  decisionId: string;
  reasoning: string;
  newChosen?: string;
}

export interface ContradictOptions {
  decisionId: string;
  evidence: string;
  reasoning: string;
}

export interface ReinforceOptions {
  decisionId: string;
  evidence: string;
  reason: string;
}

/**
 * Decision Revision - Create new decision that supersedes old one
 */
export async function reviseDecision(
  decisionId: string,
  reasoning: string,
  newChosen?: string
): Promise<void> {
  try {
    // Load the original decision
    const original = await loadDecision(decisionId);
    if (!original) {
      throw new Error(`Decision ${decisionId} not found`);
    }

    const { guard } = createWorkspaceStore();
    
    // Create revised decision
    const revised = createDecisionV1({
      title: `[REVISED] ${original.title}`,
      options: original.options,
      chosen: newChosen || original.chosen,
      reasoning: `REVISED: ${reasoning}`,
      mode: "inferred",
      confidence: 1.0,
      scope: original.scope,
      status: "active",
      supersedes: decisionId,
      links: [decisionId],
      context: original.context,
    });

    // Append revised decision
    const block = await guard.appendBlock("decisions", {
      type: "decision",
      content: JSON.stringify(revised),
      tags: ["decision", "revised", "active", ...(original.tags || []).filter((t: string) => t !== "active")],
      agent: "revise",
    });

    // Mark original as revised
    await markDecisionStatus(decisionId, "revised");

    console.log(`✓ Decision revised: ${block.hash.substring(0, 8)}`);
    console.log(`  Original: ${decisionId}`);
    console.log(`  Status: ${original.status} → revised → active`);
    console.log(`  Reasoning: ${reasoning}`);
  } catch (error) {
    console.error(`✗ Failed to revise decision:`, error);
    throw error;
  }
}

/**
 * Contradict Decision - Mark decision as contradicted
 */
export async function contradictDecision(
  decisionId: string,
  evidence: string,
  reasoning: string
): Promise<void> {
  try {
    // Load the original decision
    const original = await loadDecision(decisionId);
    if (!original) {
      throw new Error(`Decision ${decisionId} not found`);
    }

    const { guard } = createWorkspaceStore();
    
    // Create contradiction record
    const contradiction = createDecisionV1({
      title: `[CONTRADICTION] ${original.title}`,
      options: original.options,
      chosen: original.chosen,
      reasoning: `CONTRADICTION: ${reasoning}`,
      mode: "inferred",
      confidence: 1.0,
      scope: original.scope,
      status: "active",
      evidence: {
        refs: [evidence],
        note: `Contradicts decision ${decisionId}`,
      },
      context: original.context,
    });

    // Append contradiction
    const block = await guard.appendBlock("decisions", {
      type: "decision",
      content: JSON.stringify(contradiction),
      tags: ["decision", "contradiction", "active", ...(original.tags || []).filter((t: string) => t !== "active")],
      agent: "contradict",
    });

    // Mark original as contradicted
    await markDecisionStatus(decisionId, "contradicted");

    console.log(`✓ Decision contradicted: ${block.hash.substring(0, 8)}`);
    console.log(`  Original: ${decisionId}`);
    console.log(`  Status: ${original.status} → contradicted`);
    console.log(`  Evidence: ${evidence}`);
  } catch (error) {
    console.error(`✗ Failed to contradict decision:`, error);
    throw error;
  }
}

/**
 * Reinforce Decision - Strengthen with new evidence
 */
export async function reinforceDecision(
  decisionId: string,
  evidence: string,
  reason: string
): Promise<void> {
  try {
    // Load the original decision
    const original = await loadDecision(decisionId);
    if (!original) {
      throw new Error(`Decision ${decisionId} not found`);
    }

    const { guard } = createWorkspaceStore();
    
    // Create reinforcement record
    const reinforcement = createDecisionV1({
      title: `[REINFORCEMENT] ${original.title}`,
      options: original.options,
      chosen: original.chosen,
      reasoning: `REINFORCEMENT: ${reason}`,
      mode: "inferred",
      confidence: 1.0,
      scope: original.scope,
      status: "active",
      evidence: {
        refs: [evidence],
        note: `Reinforces decision ${decisionId}`,
      },
      context: original.context,
    });

    // Append reinforcement
    const block = await guard.appendBlock("decisions", {
      type: "decision",
      content: JSON.stringify(reinforcement),
      tags: ["decision", "reinforcement", "active", ...(original.tags || []).filter((t: string) => t !== "active")],
      agent: "reinforce",
    });

    console.log(`✓ Decision reinforced: ${block.hash.substring(0, 8)}`);
    console.log(`  Original: ${decisionId}`);
    console.log(`  Status: ${original.status} → active (reinforced)`);
    console.log(`  Evidence: ${evidence}`);
  } catch (error) {
    console.error(`✗ Failed to reinforce decision:`, error);
    throw error;
  }
}

/**
 * Load decision by ID
 */
async function loadDecision(decisionId: string): Promise<any> {
  // Note: This is a simplified version
  // In full implementation, we would search the chain by decisionId
  // For now, return null (not implemented in MVP)
  return null;
}

/**
 * Mark decision with new status
 */
async function markDecisionStatus(decisionId: string, status: string): Promise<void> {
  // Note: In full implementation, we would update the original decision's status
  // For MVP, we log the intent
  log.debug(`Would mark decision ${decisionId} as ${status}`);
}
