import { Store } from "../memory/store.js";
import type { MemphisConfig } from "../config/loader.js";
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
export interface StatusReport {
    ok: boolean;
    chains: ChainStatus[];
    providers: ProviderStatus[];
    vault: VaultStatus;
    recent: RecentBlock[];
}
/**
 * Build comprehensive status report from store and config (sync)
 */
export declare function buildStatusReport(store: Store, config: MemphisConfig): StatusReport;
