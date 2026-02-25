import { Store } from "./store.js";
export interface QuarantineResult {
    chain: string;
    status: "ok" | "fixed" | "broken";
    head: number;
    quarantined: number;
    quarantine_dir?: string;
    errors: string[];
}
export interface ReviseOptions {
    chain?: string;
    dryRun?: boolean;
    json?: boolean;
}
/**
 * Revise all chains or specific chain
 */
export declare function revise(store: Store, options: ReviseOptions): QuarantineResult[];
