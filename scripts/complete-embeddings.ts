#!/usr/bin/env node
/**
 * Embeddings Completion Script for Memphis v3.5.0
 * Embeds remaining chains: decision, share, summary, trade, vault
 *
 * Usage:
 *   node complete-embeddings.ts [--chain <name>] [--batch-size <n>] [--dry-run]
 */

import { Store } from "../memory/store.js";
import { LocalOllamaBackend } from "../embeddings/backends/local.js";
import { saveSemanticIndex, loadSemanticIndex } from "../embeddings/loader.js";
import type { Block } from "../memory/chain.js";

const CHAINS_TO_EMBED = [
  "decision",
  "share",
  "summary",
  "trade",
  "vault"
];

const BATCH_SIZE = 10; // Process N blocks at a time
const DELAY_BETWEEN_BATCHES_MS = 100; // Small delay to avoid overwhelming backend

interface EmbeddingStats {
  chain: string;
  totalBlocks: number;
  alreadyEmbedded: number;
  newlyEmbedded: number;
  failed: number;
  skipped: number;
  duration: number;
}

async function completeChainEmbeddings(
  store: Store,
  backend: LocalOllamaBackend,
  chainName: string,
  batchSize: number = BATCH_SIZE,
  dryRun: boolean = false
): Promise<EmbeddingStats> {
  const startTime = Date.now();
  const stats: EmbeddingStats = {
    chain: chainName,
    totalBlocks: 0,
    alreadyEmbedded: 0,
    newlyEmbedded: 0,
    failed: 0,
    skipped: 0,
    duration: 0
  };

  try {
    // Read chain blocks
    const blocks = store.readChain(chainName);
    stats.totalBlocks = blocks.length;

    if (blocks.length === 0) {
      console.log(`[Embeddings] Chain ${chainName} is empty, skipping`);
      stats.duration = Date.now() - startTime;
      return stats;
    }

    // Load existing embeddings
    const existingIndex = loadSemanticIndex(chainName);
    const embeddedBlockIndices = new Set(existingIndex.map(e => e.blockIndex));

    // Find blocks that need embedding
    const blocksToEmbed: Block[] = [];
    for (const block of blocks) {
      if (!embeddedBlockIndices.has(block.index)) {
        blocksToEmbed.push(block);
      } else {
        stats.alreadyEmbedded++;
      }
    }

    if (blocksToEmbed.length === 0) {
      console.log(`[Embeddings] Chain ${chainName} already fully embedded (${stats.alreadyEmbedded}/${stats.totalBlocks})`);
      stats.duration = Date.now() - startTime;
      return stats;
    }

    console.log(`[Embeddings] Chain ${chainName}: ${blocksToEmbed.length} blocks to embed (already: ${stats.alreadyEmbedded})`);

    if (dryRun) {
      console.log(`[Embeddings] DRY RUN: Would embed ${blocksToEmbed.length} blocks for ${chainName}`);
      stats.newlyEmbedded = blocksToEmbed.length;
      stats.duration = Date.now() - startTime;
      return stats;
    }

    // Process in batches
    const allNewEntries: any[] = [];

    for (let i = 0; i < blocksToEmbed.length; i += batchSize) {
      const batch = blocksToEmbed.slice(i, i + batchSize);

      try {
        // Embed batch
        const vectors = await backend.embedBlocks(batch);

        // Create index entries
        for (let j = 0; j < batch.length; j++) {
          const block = batch[j];
          const vector = vectors[j];

          if (vector && vector.length > 0) {
            allNewEntries.push({
              blockIndex: block.index,
              vector,
              timestamp: block.timestamp,
              snippet: block.data.content?.substring(0, 120) || ""
            });
            stats.newlyEmbedded++;
          } else {
            console.warn(`[Embeddings] Failed to embed block ${chainName}#${block.index}`);
            stats.failed++;
          }
        }

        // Progress report
        const progress = Math.min(i + batchSize, blocksToEmbed.length);
        console.log(`[Embeddings] ${chainName}: ${progress}/${blocksToEmbed.length} blocks embedded`);

        // Small delay between batches
        if (i + batchSize < blocksToEmbed.length) {
          await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES_MS));
        }
      } catch (err) {
        console.error(`[Embeddings] Batch failed for ${chainName}:`, err);
        stats.failed += batch.length;
      }
    }

    // Save to index
    if (allNewEntries.length > 0) {
      const finalIndex = [...existingIndex, ...allNewEntries];
      saveSemanticIndex(chainName, finalIndex);
      console.log(`[Embeddings] Saved ${allNewEntries.length} new embeddings for ${chainName}`);
    }

    stats.duration = Date.now() - startTime;
    return stats;
  } catch (err) {
    console.error(`[Embeddings] Failed to process chain ${chainName}:`, err);
    stats.duration = Date.now() - startTime;
    return stats;
  }
}

async function main() {
  const args = process.argv.slice(2);

  const chainArgIndex = args.indexOf("--chain");
  const specificChain = chainArgIndex !== -1 ? args[chainArgIndex + 1] : null;

  const batchSizeIndex = args.indexOf("--batch-size");
  const batchSize = batchSizeIndex !== -1 ? parseInt(args[batchSizeIndex + 1]) : BATCH_SIZE;

  const dryRun = args.includes("--dry-run");

  console.log("[Embeddings] Memphis Embeddings Completion v3.5.0");
  console.log(`[Embeddings] Mode: ${dryRun ? "DRY RUN" : "LIVE"}`);
  console.log(`[Embeddings] Batch size: ${batchSize}`);
  console.log("");

  // Initialize
  const store = new Store();
  const backend = new LocalOllamaBackend();

  try {
    await backend.init();
    console.log("[Embeddings] Backend initialized successfully");
  } catch (err) {
    console.error("[Embeddings] Failed to initialize backend:", err);
    process.exit(1);
  }

  // Determine which chains to process
  const chainsToProcess = specificChain
    ? [specificChain]
    : CHAINS_TO_EMBED;

  const allStats: EmbeddingStats[] = [];
  const overallStart = Date.now();

  // Process each chain
  for (const chain of chainsToProcess) {
    console.log(`\n[Embeddings] Processing chain: ${chain}`);
    const stats = await completeChainEmbeddings(store, backend, chain, batchSize, dryRun);
    allStats.push(stats);
  }

  // Summary
  const overallDuration = Date.now() - overallStart;
  console.log("\n" + "=".repeat(60));
  console.log("[Embeddings] COMPLETION SUMMARY");
  console.log("=".repeat(60));

  let totalBlocks = 0;
  let totalNewlyEmbedded = 0;
  let totalFailed = 0;

  for (const stats of allStats) {
    console.log(`\n${stats.chain}:`);
    console.log(`  Total blocks: ${stats.totalBlocks}`);
    console.log(`  Already embedded: ${stats.alreadyEmbedded}`);
    console.log(`  Newly embedded: ${stats.newlyEmbedded}`);
    if (stats.failed > 0) {
      console.log(`  Failed: ${stats.failed}`);
    }
    console.log(`  Duration: ${(stats.duration / 1000).toFixed(2)}s`);

    totalBlocks += stats.totalBlocks;
    totalNewlyEmbedded += stats.newlyEmbedded;
    totalFailed += stats.failed;
  }

  console.log("\n" + "-".repeat(60));
  console.log(`TOTAL:`);
  console.log(`  Chains processed: ${allStats.length}`);
  console.log(`  Total blocks: ${totalBlocks}`);
  console.log(`  Total newly embedded: ${totalNewlyEmbedded}`);
  if (totalFailed > 0) {
    console.log(`  Total failed: ${totalFailed}`);
  }
  console.log(`  Overall duration: ${(overallDuration / 1000).toFixed(2)}s`);
  console.log("=".repeat(60));

  if (dryRun) {
    console.log("\n[Embeddings] This was a DRY RUN - no changes made");
  } else {
    console.log("\n[Embeddings] Embeddings completion successful! ✅");
  }
}

main().catch(err => {
  console.error("[Embeddings] Fatal error:", err);
  process.exit(1);
});
