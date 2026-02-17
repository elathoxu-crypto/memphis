import type { Block } from "./chain.js";
import type { Store } from "./store.js";
export interface QueryOptions {
    chain?: string;
    keyword?: string;
    tag?: string;
    type?: string;
    limit?: number;
}
export declare function queryBlocks(store: Store, opts: QueryOptions): Block[];
