/**
 * Memphis TUI – Ask Screen
 */
import type { Store } from "../../memory/store.js";
import type { TUIWidgets } from "../app.js";
import { queryBlocks } from "../../memory/query.js";
import { safeAsync, validateInput } from "../helpers.js";
import type { LLMMessage } from "../../providers/index.js";

export function renderAskStatic(llmProviderName: string): string {
  const providerInfo = llmProviderName !== "none"
    ? `{green}Provider: ${llmProviderName}{/green}`
    : `{yellow}⚠️ Brak skonfigurowanego providera LLM. Zainstaluj Ollama lub ustaw klucz API.{/yellow}`;

  return (
    `{bold}{cyan}💬 Ask Memphis{/cyan}{/bold}\n\n` +
    `${providerInfo}\n\n` +
    `Zadaj pytanie o swoją pamięć.\n\n` +
    `{white}Naciśnij Enter, aby zapytać...{/white}\n`
  );
}

export function setupAskInput(
  store: Store,
  widgets: TUIWidgets,
  llmProvider: any,
  llmProviderName: string,
  selectedModel: string,
  onDone: () => void
): void {
  const { inputBox, inputField, contentBox, screen } = widgets;

  setTimeout(() => {
    inputBox.show();
    (inputField.options as any).placeholder = "O co chcesz zapytać?";
    inputField.focus();

    inputField.readInput(async (_err: any, value: any) => {
      if (validateInput(value)) {
        contentBox.setContent(`{bold}Myślę...{/bold}\n`);
        screen.render();

        const answer = await askLLM(store, llmProvider, value.trim(), selectedModel);

        let out = `{bold}Pytanie: "${value.trim()}"{/bold}\n\n`;
        out += `{white}Odpowiedź:{/white}\n\n${answer}\n\n`;
        out += `{gray}Provider: ${llmProviderName}{/gray}\n\n`;
        out += `{white}Naciśnij dowolny klawisz, aby kontynuować...{/white}`;
        contentBox.setContent(out);
      }
      inputBox.hide();
      screen.render();
      onDone();
    });
  }, 100);
}

async function askLLM(store: Store, provider: any, question: string, model: string): Promise<string> {
  if (!provider || !provider.isConfigured()) {
    return "Brak skonfigurowanego providera LLM. Zainstaluj Ollama lub skonfiguruj klucz API.";
  }

  const results = queryBlocks(store, { keyword: question, limit: 5 });
  const context = results.map((b: any) => b.data?.content).filter(Boolean).join("\n");

  const messages: LLMMessage[] = [
    {
      role: "system",
      content: "Jesteś Memphis, pomocnym asystentem AI z dostępem do lokalnej pamięci. Odpowiadaj krótko i po polsku, chyba że użytkownik pisze po angielsku.",
    },
  ];

  if (context) {
    messages.push({ role: "system", content: `Kontekst z pamięci:\n${context}` });
  }

  messages.push({ role: "user", content: question });

  const [response, err] = await safeAsync<{ content: string }>(() =>
    provider.chat(messages, { model })
  );

  if (err) return `Błąd: ${err.message}`;
  return response?.content ?? "Brak odpowiedzi.";
}
