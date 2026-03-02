/**
 * Memphis TUI – Summary Screen
 */
import type { Store } from "../../memory/store.js";
import type { TUIWidgets } from "../app.js";
import { truncate, formatDate } from "../helpers.js";
import type { Block } from "../../memory/chain.js";

export function renderSummaryStatic(): string {
  let content = `{bold}{cyan}📊 Summary – Historia podsumowań{/cyan}{/bold}\n\n`;
  content += `Przeglądaj autogenerowane podsumowania.\n\n`;
  content += `{white}Naciśnij Enter, aby zobaczyć...{/white}\n`;
  return content;
}

/**
 * Load summaries from chain
 */
function loadSummaries(store: Store): Block[] {
  return store.readChain("summary").reverse(); // newest first
}

/**
 * Render summaries list
 */
function renderSummariesList(summaries: Block[]): string {
  if (summaries.length === 0) {
    return `{yellow}Brak zapisanych podsumowań.{/yellow}\n\n{white}Naciśnij dowolny klawisz, aby wrócić...{/white}`;
  }

  let out = `{bold}Znaleziono ${summaries.length} podsumowań:{/bold}\n\n`;
  
  summaries.forEach((block: Block, i: number) => {
    const range = block.data.summary_range;
    const refsCount = block.data.summary_refs?.length || 0;
    const stats = block.data.content?.match(/(\d+) journal/i)?.[1] || "?";
    const tags = block.data.tags?.join(", ") || "";
    
    // Extract first highlight or first line
    const lines = block.data.content?.split("\n") || [];
    const highlight = lines.find(l => l.startsWith("- ")) || lines[5] || "";
    
    out += `{cyan}${i + 1}. ${formatDate(block.timestamp)}{/cyan}\n`;
    out += `   {gray}Range: ${range?.from} → ${range?.to}{/gray} | ${refsCount} refs\n`;
    out += `   {gray}${truncate(highlight, 60)}{/gray}\n\n`;
  });

  out += `\n{white}Wpisz numer, aby zobaczyć szczegóły (lub Enter, aby wrócić):{/white}`;
  return out;
}

/**
 * Render single summary detail
 */
function renderSummaryDetail(block: Block): string {
  const range = block.data.summary_range;
  const refs = block.data.summary_refs || [];
  const version = block.data.summary_version || "unknown";

  let out = `{bold}{cyan}📊 Podsumowanie{/cyan}{/bold}\n\n`;
  out += `{bold}Range:{/bold} ${range?.from} → ${range?.to}\n`;
  out += `{bold}Version:{/bold} ${version}\n`;
  out += `{bold}Refs:{/bold} ${refs.length}\n\n`;
  
  out += `---\n\n`;
  
  // Show content (highlights, tags)
  out += block.data.content || "(brak treści)";
  
  out += `\n\n---\n\n`;
  
  // Show refs
  out += `{bold}Referencje (${refs.length}):{/bold}\n`;
  
  if (refs.length === 0) {
    out += `{gray}Brak{/gray}\n`;
  } else {
    // Group by chain
    const byChain: Record<string, number[]> = {};
    for (const ref of refs) {
      if (!byChain[ref.chain]) byChain[ref.chain] = [];
      byChain[ref.chain].push(ref.index);
    }
    
    for (const [chain, indices] of Object.entries(byChain)) {
      out += `{cyan}${chain}{/cyan}: ${indices.slice(0, 10).map(i => String(i).padStart(6, "0")).join(", ")}`;
      if (indices.length > 10) out += ` ... (+${indices.length - 10} more)`;
      out += "\n";
    }
  }
  
  out += `\n{gray}Hash: ${truncate(block.hash, 20)}{/gray}\n`;
  out += `\n{white}Naciśnij Enter, aby wrócić...{/white}`;
  return out;
}

export function setupSummaryInput(
  store: Store,
  widgets: TUIWidgets,
  onDone: () => void
): void {
  const { inputBox, inputField, contentBox, screen } = widgets;

  const summaries = loadSummaries(store);
  let currentSummary: Block | null = null;

  const showList = () => {
    let out = renderSummariesList(summaries);
    contentBox.setContent(out);
    inputBox.hide();
    screen.render();
  };

  const showDetail = (block: Block) => {
    currentSummary = block;
    let out = renderSummaryDetail(block);
    contentBox.setContent(out);
    inputBox.hide();
    screen.render();
  };

  setTimeout(() => {
    if (summaries.length === 0) {
      contentBox.setContent(renderSummariesList(summaries));
      screen.render();
      
      inputField.on("keypress", () => {
        onDone();
      });
      return;
    }

    showList();

    inputField.readInput((_err: any, value: any) => {
      if (!value || value.trim() === "") {
        if (currentSummary) {
          currentSummary = null;
          showList();
          screen.render();
          setTimeout(() => {
            inputField.readInput(showList);
          }, 100);
        } else {
          onDone();
        }
        return;
      }

      const num = parseInt(value.trim());
      if (!isNaN(num) && num > 0 && num <= summaries.length) {
        showDetail(summaries[num - 1]);
        
        inputField.once("keypress", () => {
          showList();
          screen.render();
          setTimeout(() => {
            inputField.readInput(showList);
          }, 100);
        });
      } else {
        onDone();
      }
    });
  }, 100);
}
