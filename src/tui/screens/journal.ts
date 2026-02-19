/**
 * Memphis TUI – Journal Screen
 */
import type { Store } from "../../memory/store.js";
import type { TUIWidgets } from "../app.js";
import { validateInput } from "../helpers.js";

export function renderJournalStatic(): string {
  let content = `{bold}{cyan}📓 Journal Entry{/cyan}{/bold}\n\n`;
  content += `Dodaj nowy wpis do pamięci.\n\n`;
  content += `{white}Naciśnij Enter, aby zacząć pisać...{/white}\n`;
  return content;
}

export function setupJournalInput(
  store: Store,
  widgets: TUIWidgets,
  onDone: () => void
): void {
  const { inputBox, inputField, contentBox, screen } = widgets;

  setTimeout(() => {
    inputBox.show();
    (inputField.options as any).placeholder = "Co masz na myśli?";
    inputField.focus();
    inputField.readInput((_err: any, value: any) => {
      if (validateInput(value)) {
        store.addBlock("journal", {
          type: "journal",
          content: value.trim(),
          tags: [],
        });
        contentBox.setContent(
          `{green}✅ Wpis dodany pomyślnie!{/green}\n\nNaciśnij dowolny klawisz, aby wrócić...`
        );
      } else {
        contentBox.setContent(`{yellow}Anulowano.{/yellow}\n`);
      }
      inputBox.hide();
      screen.render();
      onDone();
    });
  }, 100);
}
