/**
 * Memphis TUI – Cline Screen
 */
import type { Store } from "../../memory/store.js";
import type { TUIWidgets } from "../app.js";
import { truncate, validateInput } from "../helpers.js";

export function renderCline(store: Store): string {
  const logs = store.readChain("journal");
  const clineLogs = logs
    .filter((b: any) => b.data?.content?.includes("[cline]"))
    .slice(-10)
    .reverse();

  let content = `{bold}{cyan}🤖 Cline – AI Coding Assistant{/cyan}{/bold}\n\n`;
  content += `{white}Cline to asystent kodowania AI zintegrowany z Memphis.{/white}\n\n`;

  content += `{bold}Ostatnia aktywność Cline:{/bold}\n`;
  if (clineLogs.length === 0) {
    content += `  {yellow}Brak aktywności Cline. Uruchom Cline w VS Code, aby zapisywać logi.{/yellow}\n`;
  } else {
    for (const block of clineLogs) {
      content += `  {cyan}•{/cyan} ${truncate(block.data?.content ?? "", 70)}\n`;
    }
  }

  content += `\n{bold}Dostępne komendy:{/bold}\n`;
  content += `  {cyan}cline --help{/cyan}     – Pomoc Cline\n`;
  content += `  {cyan}cline <prompt>{/cyan}   – Uruchom zadanie\n`;
  content += `  {cyan}cline -a{/cyan}         – Tryb akcji\n\n`;

  content += `{white}Naciśnij Enter, aby zalogować komendę Cline...{/white}\n`;
  content += `{gray}(Cline integracja: logowanie lokalnie do łańcucha){/gray}\n`;

  return content;
}

export function setupClineInput(
  store: Store,
  widgets: TUIWidgets,
  onDone: () => void
): void {
  const { inputBox, inputField, contentBox, screen } = widgets;

  setTimeout(() => {
    inputBox.show();
    (inputField.options as any).placeholder = "Wpisz prompt Cline:";
    inputField.focus();

    inputField.readInput((_err: any, value: any) => {
      if (validateInput(value)) {
        // Log command to journal chain (no require() needed - use store directly)
        store.addBlock("journal", {
          type: "journal",
          content: `[cline] cmd:exec ${value.trim()} → pending`,
          tags: ["auto", "agent", "cline"],
          agent: "cline",
        });

        contentBox.setContent(
          `{white}Komenda:{/white} ${value.trim()}\n\n` +
          `{green}✅ Zalogowano do łańcucha pamięci.{/green}\n` +
          `{yellow}Uwaga: Integracja Cline jest zaplanowana. Uruchom Cline w VS Code.{/yellow}\n\n` +
          `{white}Naciśnij dowolny klawisz...{/white}`
        );
      }
      inputBox.hide();
      screen.render();
      onDone();
    });
  }, 100);
}
