import { readdirSync, readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { Store } from "../memory/store.js";
import { verifyChain } from "../memory/chain.js";
import type { MemphisConfig } from "../config/loader.js";
import { loadOfflineConfig } from "../offline/config.js";
import { EMBEDDINGS_PATH } from "../config/defaults.js";

export interface ChainStatus {
  name: string;
  blocks: number;
  first?: string;
  last?: string;
  health: "ok" | "broken" | "empty";
  broken_at?: number;
  soul_errors?: string[];
}

export interface ProviderStatus {
  name: string;
  model?: string;
  role?: string;
  health: "ready" | "no_key" | "offline" | "error";
  detail?: string;
}

export interface OfflineStatusInfo {
  enabled: "auto" | "on" | "off";
  primary: string;
  fallbacks: string[];
  lastSwitch?: string | null;
}

export interface VaultStatus {
  initialized: boolean;
  blocks: number;
  health: "ok" | "not_initialized" | "broken";
  detail?: string;
}

export interface RecentBlock {
  chain: string;
  index: number;
  timestamp: string;
  type: string;
  content: string;
}

export interface EmbeddingSummary {
  chain: string;
  vectors: number;
  backend?: string;
  model?: string;
  lastRun?: string | null;
}

export interface EmbeddingStatus {
  enabled: boolean;
  backend?: string;
  model?: string;
  storagePath: string;
  summaries: EmbeddingSummary[];
  totalVectors: number;
  chainsTracked: number;
  missingChains: string[];
  error?: string;
}

export interface StatusReport {
  ok: boolean;
  chains: ChainStatus[];
  providers: ProviderStatus[];
  vault: VaultStatus;
  recent: RecentBlock[];
  offline: OfflineStatusInfo;
  embeddings: EmbeddingStatus;
}

function loadEmbeddingSummaries(root: string): EmbeddingSummary[] {
  if (!existsSync(root)) return [];
  const summaries: EmbeddingSummary[] = [];
  const entries = readdirSync(root, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const metaPath = path.join(root, entry.name, "meta.json");
    if (!existsSync(metaPath)) continue;
    try {
      const meta = JSON.parse(readFileSync(metaPath, "utf-8"));
      summaries.push({
        chain: entry.name,
        vectors: meta.totalVectors ?? 0,
        backend: meta.backend,
        model: meta.model,
        lastRun: meta.lastRun ?? null,
      });
    } catch {
      // ignore malformed meta entries
    }
  }
  return summaries;
}

/**
 * Build comprehensive status report from store and config (sync)
 */
export function buildStatusReport(store: Store, config: MemphisConfig): StatusReport {
  const chains: ChainStatus[] = [];
  const recentBlocks: RecentBlock[] = [];
  
  // Get all chains
  const chainNames = store.listChains();
  
  for (const chainName of chainNames) {
    const blocks = store.readChain(chainName);
    const stats = store.getChainStats(chainName);
    
    let health: "ok" | "broken" | "empty" = "empty";
    let broken_at: number | undefined;
    let soul_errors: string[] | undefined;
    
    if (blocks.length > 0) {
      const verification = verifyChain(blocks);
      if (verification.valid) {
        health = "ok";
      } else {
        health = "broken";
        broken_at = verification.broken_at;
        soul_errors = verification.soul_errors;
      }
    }
    
    chains.push({
      name: chainName,
      blocks: stats.blocks,
      first: stats.first,
      last: stats.last,
      health,
      broken_at,
      soul_errors,
    });
    
    // Get last 5 blocks from this chain for recent activity
    const lastK = blocks.slice(-5);
    for (const block of lastK) {
      recentBlocks.push({
        chain: chainName,
        index: block.index,
        timestamp: block.timestamp,
        type: block.data.type,
        content: block.data.content?.substring(0, 100) || "",
      });
    }
  }
  
  // Sort recent by timestamp desc, take top 5
  recentBlocks.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  const recent = recentBlocks.slice(0, 5);
  
  // Providers
  const providers: ProviderStatus[] = [];
  const providerEntries = Object.entries(config.providers || {});
  
  for (const [name, p] of providerEntries) {
    let health: ProviderStatus["health"] = "ready";
    let detail: string | undefined;
    
    const isOllama = name === "ollama";
    const hasKey = p.api_key && p.api_key.length > 0;
    
    if (isOllama || hasKey) {
      health = "ready";
    } else {
      health = "no_key";
      detail = "No API key configured";
    }
    
    providers.push({
      name,
      model: p.model,
      role: p.role,
      health,
      detail,
    });
  }
  
  // Vault
  const vaultBlocks = store.readChain("vault");
  let vaultHealth: VaultStatus["health"] = "ok";
  let vaultDetail: string | undefined;
  
  if (vaultBlocks.length === 0) {
    vaultHealth = "not_initialized";
    vaultDetail = "Run: memphis vault init";
  }
  
  const vault: VaultStatus = {
    initialized: vaultBlocks.length > 0,
    blocks: vaultBlocks.length,
    health: vaultHealth,
    detail: vaultDetail,
  };
  
  // Overall OK?
  const allChainsOk = chains.every(c => c.health !== "broken");
  const allProvidersOk = providers.every(p => p.health === "ready");
  const ok = allChainsOk && allProvidersOk;

  const embeddingsEnabled = config.embeddings?.enabled === true;
  const embeddingsStorage = config.embeddings?.storage_path || EMBEDDINGS_PATH;
  const candidateChains = chainNames.filter(chain => chain !== "vault" && chain !== "credential");
  let embeddingSummaries: EmbeddingSummary[] = [];
  let embeddingsError: string | undefined;

  if (embeddingsEnabled) {
    try {
      embeddingSummaries = loadEmbeddingSummaries(embeddingsStorage);
    } catch (err) {
      embeddingsError = (err as Error).message;
    }
  }

  const totalVectors = embeddingSummaries.reduce((sum, s) => sum + (s.vectors || 0), 0);
  const coveredChains = new Set(embeddingSummaries.map(s => s.chain));
  const missingChains = embeddingsEnabled
    ? candidateChains.filter(chain => !coveredChains.has(chain))
    : candidateChains;

  const embeddings: EmbeddingStatus = {
    enabled: embeddingsEnabled,
    backend: config.embeddings?.backend,
    model: config.embeddings?.model,
    storagePath: embeddingsStorage,
    summaries: embeddingSummaries,
    totalVectors,
    chainsTracked: candidateChains.length,
    missingChains,
    error: embeddingsError,
  };

  const offlineConfig = loadOfflineConfig();
  const offline: OfflineStatusInfo = {
    enabled: offlineConfig.enabled,
    primary: offlineConfig.preferredModel,
    fallbacks: offlineConfig.fallbackModels,
    lastSwitch: offlineConfig.lastSwitch,
  };
  
  return {
    ok,
    chains,
    providers,
    vault,
    recent,
    offline,
    embeddings,
  };
}
