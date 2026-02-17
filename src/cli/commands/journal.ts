import { Store } from "../../memory/store.js";
import { loadConfig } from "../../config/loader.js";
import { log } from "../../utils/logger.js";

export async function journalCommand(message: string, options: { tags?: string }) {
  const config = loadConfig();
  const store = new Store(config.memory.path);
  const tags = options.tags ? options.tags.split(",").map(t => t.trim()) : [];

  const block = store.addBlock("journal", {
    type: "journal",
    content: message,
    tags,
    agent: "journal",
  });

  log.block("journal", block.index, block.hash);
  log.info(message);
}
