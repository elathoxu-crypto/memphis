import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { MEMPHIS_HOME, CONFIG_PATH, CHAINS_PATH } from "../../config/defaults.js";
import { log } from "../../utils/logger.js";
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
export async function initCommand() {
    if (existsSync(CONFIG_PATH)) {
        log.warn(`Config already exists: ${CONFIG_PATH}`);
        return;
    }
    mkdirSync(MEMPHIS_HOME, { recursive: true });
    mkdirSync(CHAINS_PATH, { recursive: true });
    writeFileSync(CONFIG_PATH, DEFAULT_YAML, "utf-8");
    log.success(`Created ${CONFIG_PATH}`);
    log.success(`Created ${CHAINS_PATH}`);
    log.info("Edit ~/.memphis/config.yaml to add your LLM provider");
    log.info("Then run: memphis journal \"hello world\"");
}
//# sourceMappingURL=init.js.map