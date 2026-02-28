import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { MEMPHIS_HOME, CONFIG_PATH, CHAINS_PATH, EMBEDDINGS_PATH } from "../../config/defaults.js";
import { log } from "../../utils/logger.js";
import { promptHidden, promptYesNo } from "../utils/prompt.js";
import { sha256 } from "../../utils/hash.js";

const DEFAULT_YAML = `# Memphis configuration
# Docs: https://github.com/oswobodzeni/memphis

providers:
  # Uncomment and configure your LLM provider:
  #
  # minimax:
  #   url: https://api.minimax.chat/v1
  #   model: minimax-text-01
  #   api_key: \${MINIMAX_API_KEY}
  #   role: primary
  #
  # openrouter:
  #   url: https://openrouter.ai/api/v1
  #   model: anthropic/claude-sonnet-4
  #   api_key: \${OPENROUTER_API_KEY}
  #   role: fallback
  #
  # ollama:
  #   url: http://localhost:11434/v1
  #   model: llama3.1
  #   role: offline

memory:
  path: ${CHAINS_PATH}
  auto_git: false

embeddings:
  enabled: false
  backend: ollama
  model: nomic-embed-text-v1
  storage_path: ${EMBEDDINGS_PATH}
  top_k: 8
  semantic_weight: 0.5

agents:
  journal:
    chain: journal
    context_window: 20
  builder:
    chain: build
    context_window: 30
  architect:
    chain: adr
    context_window: 15
  ops:
    chain: ops
    context_window: 10
`;

const SECURITY_STATE_PATH = join(MEMPHIS_HOME, "security.json");

interface SecurityState {
  passwordSet: boolean;
  passwordHash: string | null;
  allowEmpty: boolean;
  createdAt: string;
  updatedAt?: string;
}

function saveSecurityState(state: SecurityState) {
  writeFileSync(SECURITY_STATE_PATH, JSON.stringify(state, null, 2), { mode: 0o600 });
}

async function promptForPassword(): Promise<SecurityState | null> {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    return null;
  }

  const wantsPassword = await promptYesNo("Set a default Memphis password now? (y/N): ", false);
  const baseState: SecurityState = {
    passwordSet: false,
    passwordHash: null,
    allowEmpty: true,
    createdAt: new Date().toISOString(),
  };

  if (!wantsPassword) {
    return baseState;
  }

  const password = await promptHidden("Enter password (leave blank to skip): ");
  if (!password) {
    log.warn("Empty password entered. Skipping password setup.");
    return baseState;
  }

  const confirm = await promptHidden("Confirm password: ");
  if (password !== confirm) {
    log.warn("Passwords did not match. Skipping password setup.");
    return baseState;
  }

  return {
    passwordSet: true,
    passwordHash: sha256(password),
    allowEmpty: false,
    createdAt: new Date().toISOString(),
  };
}

export async function initCommand() {
  if (existsSync(CONFIG_PATH)) {
    log.warn(`Config already exists: ${CONFIG_PATH}`);
    return;
  }

  mkdirSync(MEMPHIS_HOME, { recursive: true });
  mkdirSync(CHAINS_PATH, { recursive: true });
  writeFileSync(CONFIG_PATH, DEFAULT_YAML, "utf-8");

  const securityState = await promptForPassword();
  if (securityState) {
    saveSecurityState(securityState);
    log.info(securityState.passwordSet
      ? "Vault password preference saved (hash stored locally)."
      : "Passwordless mode recorded. You can set one later with 'memphis vault init' + security tools.");
  } else {
    log.info("Skipping password prompt (non-interactive). Run 'memphis init' in a TTY or create ~/.memphis/security.json manually.");
  }

  log.success(`Created ${CONFIG_PATH}`);
  log.success(`Created ${CHAINS_PATH}`);
  log.info("Edit ~/.memphis/config.yaml to add your LLM provider");
  log.info("Then run: memphis journal \"hello world\"");
}
