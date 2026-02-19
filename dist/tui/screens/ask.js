import { queryBlocks } from "../../memory/query.js";
import { safeAsync, validateInput } from "../helpers.js";
export function renderAskStatic(llmProviderName) {
    const providerInfo = llmProviderName !== "none"
        ? `{green}Provider: ${llmProviderName}{/green}`
        : `{yellow}⚠️ Brak skonfigurowanego providera LLM. Zainstaluj Ollama lub ustaw klucz API.{/yellow}`;
    return (`{bold}{cyan}💬 Ask Memphis{/cyan}{/bold}\n\n` +
        `${providerInfo}\n\n` +
        `Zadaj pytanie o swoją pamięć.\n\n` +
        `{white}Naciśnij Enter, aby zapytać...{/white}\n`);
}
export function setupAskInput(store, widgets, llmProvider, llmProviderName, selectedModel, onDone) {
    const { inputBox, inputField, contentBox, screen } = widgets;
    setTimeout(() => {
        inputBox.show();
        inputField.options.placeholder = "O co chcesz zapytać?";
        inputField.focus();
        inputField.readInput(async (_err, value) => {
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
async function askLLM(store, provider, question, model) {
    if (!provider || !provider.isConfigured()) {
        return "Brak skonfigurowanego providera LLM. Zainstaluj Ollama lub skonfiguruj klucz API.";
    }
    const results = queryBlocks(store, { keyword: question, limit: 5 });
    const context = results.map((b) => b.data?.content).filter(Boolean).join("\n");
    const messages = [
        {
            role: "system",
            content: "Jesteś Memphis, pomocnym asystentem AI z dostępem do lokalnej pamięci. Odpowiadaj krótko i po polsku, chyba że użytkownik pisze po angielsku.",
        },
    ];
    if (context) {
        messages.push({ role: "system", content: `Kontekst z pamięci:\n${context}` });
    }
    messages.push({ role: "user", content: question });
    const [response, err] = await safeAsync(() => provider.chat(messages, { model }));
    if (err)
        return `Błąd: ${err.message}`;
    return response?.content ?? "Brak odpowiedzi.";
}
//# sourceMappingURL=ask.js.map