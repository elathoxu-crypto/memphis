import { join } from "node:path";
import { homedir } from "node:os";
import {
  DEFAULT_ALLOWED_CHAINS,
  DEFAULT_WORKSPACE_ID,
  DEFAULT_WORKSPACE_LABEL,
  WORKSPACE_TAG_PREFIX,
} from "../security/constants.js";

export const MEMPHIS_HOME = join(homedir(), ".memphis");
export const CHAINS_PATH = join(MEMPHIS_HOME, "chains");
export const CONFIG_PATH = join(MEMPHIS_HOME, "config.yaml");
export const EMBEDDINGS_PATH = join(MEMPHIS_HOME, "embeddings");
export const DAEMON_PID_PATH = join(MEMPHIS_HOME, "daemon.pid");
export const DAEMON_LOG_PATH = join(MEMPHIS_HOME, "daemon.log");
export const DAEMON_STATE_PATH = join(MEMPHIS_HOME, "daemon-state.json");

const defaultWorkspaceTag = `${WORKSPACE_TAG_PREFIX}${DEFAULT_WORKSPACE_ID}`;

export const DEFAULT_CONFIG = {
  providers: {},
  memory: {
    path: CHAINS_PATH,
    auto_git: false,
    auto_git_push: false,
  },
  embeddings: {
    enabled: false,
    backend: "ollama",
    model: "nomic-embed-text-v1",
    storage_path: EMBEDDINGS_PATH,
    top_k: 8,
    semantic_weight: 0.5,
  },
  agents: {
    journal: { chain: "journal", context_window: 20 },
    builder: { chain: "build", context_window: 30 },
    architect: { chain: "adr", context_window: 15 },
    ops: { chain: "ops", context_window: 10 },
  },
  daemon: {
    interval: 60_000,
    collectors: {
      git: { enabled: true, interval: 60_000 },
      shell: { enabled: true, interval: 60_000 },
      heartbeat: { enabled: true, interval: 5 * 60_000 },
    },
  },
  security: {
    defaultWorkspace: DEFAULT_WORKSPACE_ID,
    workspaces: [
      {
        id: DEFAULT_WORKSPACE_ID,
        label: DEFAULT_WORKSPACE_LABEL,
        allowedChains: [...DEFAULT_ALLOWED_CHAINS],
        includeDefault: true,
        tags: [defaultWorkspaceTag],
      },
    ],
  },
};
