/**
 * Memphis TUI – Decisions Screen
 */
import type { Store } from "../../memory/store.js";
import type { TUIWidgets } from "../app.js";
import { truncate, formatDate } from "../helpers.js";
import type { Block } from "../../memory/chain.js";

export function renderDecisionsStatic(): string {
  let content = `{bold}{cyan}📋 Decisions – Historia decyzji{/cyan}{/bold}\n\n`;
  content += `Przeglądaj wykryte decyzje i ich źródła.\n\n`;
  content += `{white}Naciśnij Enter, aby zobaczyć...{/white}\n`;
  return content;
}

/**
 * Load decisions from chain
 */
function loadDecisions(store: Store): Block[] {
  return store.readChain("decision").reverse(); // newest first
}

/**
 * Render decisions list
 */
function renderDecisionsList(decisions: Block[]): string {
  if (decisions.length === 0) {
    return `{yellow}Brak zapisanych decyzji.{/yellow}\n\n{white}Naciśnij dowolny klawisz, aby wrócić...{/white}`;
  }

  let out = `{bold}Znaleziono ${decisions.length} decyzji:{/bold}\n\n`;
  
  decisions.forEach((block: Block, i: number) => {
    const title = block.data.content?.split("\n")[0]?.replace(/^#\s*/, "") || "Bez tytułu";
    const source = block.data.source_ref 
      ? `${block.data.source_ref.chain}#${String(block.data.source_ref.index).padStart(6, "0")}`
      : "brak źródła";
    const tags = block.data.tags?.length > 0 
      ? `[${block.data.tags.join(", ")}]` 
      : "";
    
    out += `{cyan}${i + 1}. ${title}{/cyan} ${tags}\n`;
    out += `   {gray}→ źródło: ${source}{/gray}\n`;
    out += `   {gray}${formatDate(block.timestamp)}{/gray}\n\n`;
  });

  out += `\n{white}Wpisz numer, aby zobaczyć szczegóły (lub Enter, aby wrócić):{/white}`;
  return out;
}

/**
 * Render single decision detail
 */
function renderDecisionDetail(block: Block): string {
  const title = block.data.content?.split("\n")[0]?.replace(/^#\s*/, "") || "Bez tytułu";
  const source = block.data.source_ref 
    ? `${block.data.source_ref.chain}#${String(block.data.source_ref.index).padStart(6, "0")}`
    : "brak źródła";
  const sourceHash = block.data.source_ref?.hash || "brak";
  const tags = block.data.tags?.join(", ") || "brak";
  const confidence = block.data.content?.match(/Confidence:\s*([\d.]+)/)?.[1] || "?";

  let out = `{bold}{cyan}📋 Decyzja{/cyan}{/bold}\n\n`;
  out += `{bold}${title}{/bold}\n\n`;
  out += `---\n\n`;
  out += `{gray}Treść:{/gray}\n${block.data.content}\n\n`;
  out += `---\n\n`;
  out += `{gray}Metadane:{/gray}\n`;
  out += `  Źródło: ${source}\n`;
  out += `  Hash źródła: ${truncate(sourceHash, 16)}\n`;
  out += `  Tagi: ${tags}\n`;
  out += `  Pewność: ${confidence}\n`;
  out += `  Data: ${formatDate(block.timestamp)}\n`;
  out += `  Chain: decision#${String(block.index).padStart(6, "0")}\n`;
  out += `  Hash: ${truncate(block.hash, 16)}\n`;

  out += `\n\n{white}Naciśnij Enter, aby wrócić...{/white}`;
  return out;
}

export function setupDecisionsInput(
  store: Store,
  widgets: TUIWidgets,
  onDone: () => void
): void {
  const { inputBox, inputField, contentBox, screen } = widgets;

  const decisions = loadDecisions(store);
  let currentDecision: Block | null = null;

  const showList = () => {
    let out = renderDecisionsList(decisions);
    contentBox.setContent(out);
    inputBox.hide();
    screen.render();
  };

  const showDetail = (block: Block) => {
    currentDecision = block;
    let out = renderDecisionDetail(block);
    contentBox.setContent(out);
    inputBox.hide();
    screen.render();
  };

  setTimeout(() => {
    if (decisions.length === 0) {
      contentBox.setContent(renderDecisionsList(decisions));
      screen.render();
      
      // Wait for any key
      inputField.on("keypress", () => {
        onDone();
      });
      return;
    }

    showList();

    inputField.readInput((_err: any, value: any) => {
      if (!value || value.trim() === "") {
        // Back to list or exit
        if (currentDecision) {
          currentDecision = null;
          showList();
          screen.render();
          // Re-enable input for second press
          setTimeout(() => {
            inputField.readInput((err: any, val: any) => {
              if (!val || val.trim() === "") {
                onDone();
              } else {
                // Try to parse number
                const num = parseInt(val.trim());
                if (!isNaN(num) && num > 0 && num <= decisions.length) {
                  showDetail(decisions[num - 1]);
                  // Wait for Enter to go back
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
              }
            });
          }, 100);
          return;
        }
        onDone();
        return;
      }

      // Try to parse number
      const num = parseInt(value.trim());
      if (!isNaN(num) && num > 0 && num <= decisions.length) {
        showDetail(decisions[num - 1]);
        
        // After showing detail, wait for Enter to go back to list
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
