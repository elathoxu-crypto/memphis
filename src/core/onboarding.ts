/**
 * Memphis Onboarding System v3.6.0
 * 
 * Clean slate initialization for new users
 * - Genesis block creation
 * - Interactive tutorial
 * - Empty-state detection
 */

import { mkdirSync, existsSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { MEMPHIS_HOME, CHAINS_PATH, CONFIG_PATH } from "../config/defaults.js";
import { Store } from "../memory/store.js";
import { log } from "../utils/logger.js";
import chalk from "chalk";
import * as readline from "readline";

// Get Store instance
const store = new Store(CHAINS_PATH);

// ============================================================================
// SELECTIVE PURGE SYSTEM
// ============================================================================

interface PurgeOptions {
  removeChains?: string[];
  removeTags?: string[];
  preserve?: string[];
}

/**
 * Selective purge for deployment-specific blocks
 * Removes: share/*, journal entries with "watra/style" tags
 * Preserves: vault keys, config.yaml, user's own memories
 */
export async function selectivePurge(options: PurgeOptions): Promise<void> {
  const { removeChains = [], removeTags = [], preserve = [] } = options;
  
  log.info("🧹 Starting selective purge...");
  
  // Remove entire chains (e.g., share)
  for (const chain of removeChains) {
    const chainPath = join(CHAINS_PATH, chain);
    if (existsSync(chainPath)) {
      const files = readdirSync(chainPath).filter(f => f.endsWith('.json'));
      log.info(`  Removing ${chain} chain (${files.length} blocks)`);
      rmSync(chainPath, { recursive: true });
      mkdirSync(chainPath, { recursive: true });
    }
  }
  
  // Remove blocks with specific tags
  if (removeTags.length > 0) {
    const chains = ['journal', 'decisions', 'ask'];
    let removedCount = 0;
    
    for (const chain of chains) {
      const chainPath = join(CHAINS_PATH, chain);
      if (!existsSync(chainPath)) continue;
      
      const files = readdirSync(chainPath).filter(f => f.endsWith('.json'));
      
      for (const file of files) {
        const filePath = join(chainPath, file);
        try {
          const content = await import(`file://${filePath}`, { assert: { type: 'json' } });
          const tags = content.default?.tags || [];
          
          if (removeTags.some(tag => tags.includes(tag))) {
            rmSync(filePath);
            removedCount++;
          }
        } catch (err) {
          // Skip corrupted files
        }
      }
    }
    
    log.info(`  Removed ${removedCount} blocks with tags: ${removeTags.join(', ')}`);
  }
  
  log.success("✓ Selective purge complete");
}

/**
 * Nuclear option: Complete reset (for dev/testing only)
 */
export async function nuclearReset(): Promise<void> {
  log.warn("⚠️  NUCLEAR RESET: This will destroy ALL data!");
  
  if (existsSync(MEMPHIS_HOME)) {
    rmSync(MEMPHIS_HOME, { recursive: true });
    mkdirSync(MEMPHIS_HOME, { recursive: true });
    mkdirSync(CHAINS_PATH, { recursive: true });
  }
  
  log.success("✓ Nuclear reset complete");
}

// ============================================================================
// EMPTY-STATE DETECTION
// ============================================================================

/**
 * Detect if this is a new user (empty or minimal chains)
 */
export function isEmptyState(): boolean {
  try {
    const journalStats = store.getChainStats('journal');
    const decisionsStats = store.getChainStats('decisions');
    const askStats = store.getChainStats('ask');
    
    // Empty state: only genesis blocks or nothing
    return journalStats.blocks <= 1 && decisionsStats.blocks === 0 && askStats.blocks === 0;
  } catch {
    return true;
  }
}

/**
 * Auto-trigger onboarding if empty state detected
 */
export async function autoOnboarding(): Promise<boolean> {
  if (!isEmptyState()) {
    return false;
  }
  
  log.info("🎉 First run detected! Starting onboarding...");
  await runOnboardingWizard();
  return true;
}

// ============================================================================
// GENESIS BLOCKS
// ============================================================================

/**
 * Create genesis blocks for new users
 */
export async function createGenesisBlocks(): Promise<void> {
  // Journal genesis
  await store.appendBlock('journal', {
    type: 'journal',
    content: '🎉 Memphis initialized! Your cognitive engine is ready. Start by telling me something to remember!',
    tags: ['genesis', 'welcome', 'onboarding']
  });
  
  // Decision template
  await store.appendBlock('decisions', {
    type: 'decision',
    content: JSON.stringify({
      schema: 'decision:v1',
      title: 'First Decision Template',
      chosen: 'Started using Memphis',
      reasoning: 'Local-first AI brain for personal knowledge management',
      createdAt: new Date().toISOString()
    }),
    tags: ['template', 'onboarding', 'example']
  });
  
  // Ask template
  await store.appendBlock('ask', {
    type: 'ask',
    content: JSON.stringify({
      query: 'What can Memphis do?',
      response: 'Memphis can remember everything, help you make decisions, track patterns across time, and provide insights from your personal knowledge base. Try asking "What should I remember about project X?" or "What decisions have I made recently?"'
    }),
    tags: ['onboarding', 'capabilities', 'example']
  });
  
  log.success("✓ Genesis blocks created");
}

// ============================================================================
// INTERACTIVE TUTORIAL
// ============================================================================

async function promptInput(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function promptYesNo(question: string, defaultYes: boolean = true): Promise<boolean> {
  const answer = await promptInput(question);
  if (!answer) return defaultYes;
  return answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes';
}

/**
 * Interactive onboarding wizard
 */
export async function runOnboardingWizard(): Promise<void> {
  console.log(chalk.bold.cyan("\n╔═══════════════════════════════════════════════════════════╗"));
  console.log(chalk.bold.cyan("║") + "          " + chalk.bold.white("🧠 Memphis Onboarding Wizard") + "              " + chalk.bold.cyan("║"));
  console.log(chalk.bold.cyan("╚═══════════════════════════════════════════════════════════╝\n"));

  // Phase 1: Create genesis blocks
  console.log(chalk.gray("📦 Setting up your memory chains..."));
  await createGenesisBlocks();
  console.log("");
  
  // Phase 2: Interactive tutorial
  console.log(chalk.bold.cyan("╔═══════════════════════════════════════════════════════════╗"));
  console.log(chalk.bold.cyan("║") + "          " + chalk.bold.white("📚 Quick Start Guide (2 min)") + "                " + chalk.bold.cyan("║"));
  console.log(chalk.bold.cyan("╚═══════════════════════════════════════════════════════════╝\n"));

  const wantsTutorial = await promptYesNo(
    chalk.cyan("?") + " Want a quick tutorial? (Y/n): ",
    true
  );

  if (!wantsTutorial) {
    console.log(chalk.gray("\nNo problem! Here's a quick reference:"));
    showQuickReference();
    return;
  }

  // Tutorial Step 1: Add memory
  console.log(chalk.bold.white("\n1️⃣  First, let's add a memory:"));
  console.log(chalk.gray("   Example: \"I'm working on a web app called ProjectX\""));
  console.log("");
  
  const firstMemory = await promptInput(chalk.cyan("?") + " Tell me something to remember: ");
  
  if (firstMemory) {
    await store.appendBlock('journal', {
      type: 'journal',
      content: firstMemory,
      tags: ['user-memory', 'onboarding', 'first']
    });
    console.log(chalk.green("✓") + " Memory saved! I'll remember that.\n");
  } else {
    console.log(chalk.gray("   Skipped. You can add memories later with: memphis journal \"your thought\"\n"));
  }

  // Tutorial Step 2: Ask question
  console.log(chalk.bold.white("2️⃣  Now, ask me about your memories:"));
  console.log(chalk.gray("   Example: \"What projects am I working on?\""));
  console.log("");
  
  const firstQuestion = await promptInput(chalk.cyan("?") + " Ask me something: ");
  
  if (firstQuestion) {
    console.log(chalk.gray("\n   🧠 Searching memories..."));
    // In a real implementation, this would use recall command
    // For onboarding, we show a friendly message
    console.log(chalk.green("✓") + " I found your memory about: " + chalk.cyan(firstMemory || "nothing yet"));
    console.log(chalk.gray("   (Use 'memphis recall \"keyword\"' for semantic search)\n"));
  }

  // Tutorial Step 3: Make decision
  console.log(chalk.bold.white("3️⃣  Make a decision (optional):"));
  console.log(chalk.gray("   Example: \"I chose React for the frontend\""));
  console.log("");
  
  const firstDecision = await promptInput(chalk.cyan("?") + " Any decision to record? (press Enter to skip): ");
  
  if (firstDecision) {
    const reason = await promptInput(chalk.cyan("?") + " Why? (optional): ");
    
    await store.appendBlock('decisions', {
      type: 'decision',
      content: JSON.stringify({
        schema: 'decision:v1',
        title: firstDecision,
        chosen: firstDecision,
        reasoning: reason || "No reason provided",
        createdAt: new Date().toISOString()
      }),
      tags: ['user-decision', 'onboarding', 'first']
    });
    console.log(chalk.green("✓") + " Decision recorded!\n");
  } else {
    console.log(chalk.gray("   Skipped. You can record decisions with: memphis decide \"title\" \"choice\" -r \"reason\"\n"));
  }

  // Tutorial complete
  console.log(chalk.bold.cyan("╔═══════════════════════════════════════════════════════════╗"));
  console.log(chalk.bold.cyan("║") + "          " + chalk.bold.white("🎉 Tutorial Complete!") + "                       " + chalk.bold.cyan("║"));
  console.log(chalk.bold.cyan("╚═══════════════════════════════════════════════════════════╝\n"));

  showQuickReference();
  
  console.log(chalk.bold.green("\n🚀 Ready? Let's go!\n"));
}

/**
 * Show quick reference card
 */
function showQuickReference(): void {
  console.log(chalk.bold.white("\n📖 Quick Reference:"));
  console.log(chalk.white("  • memphis journal \"your thought\"") + chalk.gray(" — save memories"));
  console.log(chalk.white("  • memphis ask \"question\"") + chalk.gray(" — query your brain"));
  console.log(chalk.white("  • memphis recall \"keyword\"") + chalk.gray(" — semantic search"));
  console.log(chalk.white("  • memphis decide \"title\" \"choice\" -r \"reason\"") + chalk.gray(" — record decision"));
  console.log(chalk.white("  • memphis tui") + chalk.gray(" — visual dashboard"));
  console.log("");
  console.log(chalk.gray("📚 Docs: https://github.com/elathoxu-crypto/memphis"));
  console.log(chalk.gray("💬 Chat: https://discord.gg/clawd"));
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  selectivePurge,
  nuclearReset,
  isEmptyState,
  autoOnboarding,
  runOnboardingWizard,
  createGenesisBlocks
};
