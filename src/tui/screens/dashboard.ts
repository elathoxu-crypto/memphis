/**
 * Memphis TUI – Dashboard Screen
 */
import type { Store } from "../../memory/store.js";
import { truncate, formatDate } from "../helpers.js";

export function renderDashboard(store: Store): string {
  const chains = store.listChains();

  let content = `{bold}{cyan}⚡ Dashboard{/cyan}{/bold}\n\n`;
  content += `Witaj w Memphis! Twój lokalny mózg AI.\n\n`;

  if (chains.length === 0) {
    content += `{yellow}Brak łańcuchów pamięci. Zacznij od dodania wpisu do dziennika!{/yellow}\n`;
  } else {
    content += `{bold}Łańcuchy pamięci:{/bold}\n\n`;
    for (const chain of chains) {
      const stats = store.getChainStats(chain);
      content += `{cyan}▸ ${chain}{/cyan}\n`;
      content += `    Bloki:  ${stats.blocks}\n`;
      content += `    Pierwszy: ${formatDate(stats.first)}\n`;
      content += `    Ostatni:  ${formatDate(stats.last)}\n\n`;
    }
  }

  content += `\n{bold}Ostatnia aktywność:{/bold}\n`;
  for (const chain of chains.slice(0, 3)) {
    const blocks = store.readChain(chain);
    if (blocks.length > 0) {
      const last = blocks[blocks.length - 1];
      content += `  {gray}•{/gray} ${chain}: ${truncate(last.data?.content ?? "", 60)}\n`;
    }
  }

  return content;
}
