import { join } from "node:path";
import { homedir } from "node:os";
export const MEMPHIS_HOME = join(homedir(), ".memphis");
export const CHAINS_PATH = join(MEMPHIS_HOME, "chains");
export const CONFIG_PATH = join(MEMPHIS_HOME, "config.yaml");
export const DEFAULT_CONFIG = {
    providers: {},
    memory: {
        path: CHAINS_PATH,
        auto_git: false,
        auto_git_push: false,
    },
    agents: {
        journal: { chain: "journal", context_window: 20 },
        builder: { chain: "build", context_window: 30 },
        architect: { chain: "adr", context_window: 15 },
        ops: { chain: "ops", context_window: 10 },
    },
};
//# sourceMappingURL=defaults.js.map