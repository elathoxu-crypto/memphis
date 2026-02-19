/**
 * Memphis TUI – Recall Screen
 */
import type { Store } from "../../memory/store.js";
import type { TUIWidgets } from "../app.js";
import { queryBlocks } from "../../memory/query.js";
import { validateInput, truncate, formatDate } from "../helpers.js";

export function renderRecallStatic(): string {
  let content = `{bold}{cyan}🔍 Recall – Przeszukaj pamięć{/cyan}{/bold}\n\n`;
  content += `Wyszukaj we wszystkich łańcuchach pamięci.\n\n`;
  content += `{white}Naciśnij Enter, aby wyszukać...{/white}\n`;
  return content;
}

export function setupRecallInput(
  store: Store,
  widgets: TUIWidgets,
  onDone: () => void
): void {
  const { inputBox, inputField, contentBox, screen } = widgets;

  setTimeout(() => {
    inputBox.show();
    (inputField.options as any).placeholder = "Wpisz słowo kluczowe...";
    inputField.focus();

    inputField.readInput((_err: any, value: any) => {
      if (validateInput(value)) {
        const results = queryBlocks(store, { keyword: value.trim() });
        let out = `{bold}Wyniki dla "${value.trim()}":{/bold}\n\n`;

        if (results.length === 0) {
          out += `{yellow}Brak wyników.{/yellow}\n`;
        } else {
          results.forEach((block: any, i: number) => {
            out += `{cyan}${i + 1}. ${block.chain}{/cyan}\n`;
            out += `   ${truncate(block.data?.content ?? "", 100)}\n`;
            out += `   {gray}${formatDate(block.timestamp)}{/gray}\n\n`;
          });
        }
        out += `\n{white}Naciśnij dowolny klawisz, aby kontynuować...{/white}`;
        contentBox.setContent(out);
      }
      inputBox.hide();
      screen.render();
      onDone();
    });
  }, 100);
}
