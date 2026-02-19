import { validateInput } from "../helpers.js";
export function renderOffline(store, state) {
    const chains = store.listChains();
    const journalBlocks = store.getChainStats("journal");
    const vaultBlocks = store.getChainStats("vault");
    const llmStatus = state.llmProviderName !== "none"
        ? `{green}● Lokalny LLM: ${state.llmProviderName} (model: ${state.selectedModel}){/green}`
        : `{red}○ Brak LLM – zainstaluj Ollama{/red}`;
    const offlineIndicator = state.offlineMode
        ? `{bold}{yellow}╔══════════════════════════════════════╗\n║     📡 TRYB OFFLINE AKTYWNY        ║\n╚══════════════════════════════════════╝{/yellow}{/bold}`
        : `{bold}{green}╔══════════════════════════════════════╗\n║     🌐 TRYB ONLINE                 ║\n╚══════════════════════════════════════╝{/green}{/bold}`;
    return (`{bold}{cyan}📡 Memphis – Panel Offline{/cyan}{/bold}\n\n` +
        `${offlineIndicator}\n\n` +
        `{bold}🤖 LLM:{/bold}\n${llmStatus}\n\n` +
        `{bold}📊 Statystyki:{/bold}\n` +
        `   Journal: {green}${journalBlocks.blocks} bloków{/green}\n` +
        `   Vault:   {green}${vaultBlocks.blocks} sekretów{/green}\n` +
        `   Łańcuchy: ${chains.length}\n\n` +
        `{bold}⚡ Szybkie akcje:{/bold}\n` +
        `   [1] Ask        – Zapytaj AI\n` +
        `   [2] Journal    – Dodaj wpis\n` +
        `   [3] Recall     – Wyszukaj\n` +
        `   [4] OpenClaw   – Agenci\n` +
        `   [m] Zmień model Ollama\n` +
        `   [o] Przełącz tryb offline/online\n\n` +
        `{white}Naciśnij klawisz lub Enter, aby wybrać opcję...{/white}\n`);
}
export function setupOfflineInput(store, widgets, state, navigate, onDone) {
    const { inputBox, inputField, contentBox, screen } = widgets;
    setTimeout(() => {
        inputBox.show();
        inputField.options.placeholder = "Wpisz numer lub klawisz:";
        inputField.focus();
        inputField.readInput((_err, value) => {
            const input = (value ?? "").trim().toLowerCase();
            if (input === "m") {
                inputField.setValue("");
                inputField.options.placeholder = "Nazwa modelu (np. llama3.2:1b):";
                screen.render();
                inputField.readInput((_e2, modelValue) => {
                    if (validateInput(modelValue)) {
                        state.selectedModel = modelValue.trim();
                        process.env.OLLAMA_MODEL = modelValue.trim();
                        contentBox.setContent(`{green}✅ Model zmieniony na: ${modelValue.trim()}{/green}\n\nNaciśnij dowolny klawisz...`);
                    }
                    inputBox.hide();
                    screen.render();
                    onDone();
                });
                return;
            }
            if (input === "o") {
                state.offlineMode = !state.offlineMode;
                contentBox.setContent(`{cyan}Tryb offline: ${state.offlineMode ? "WŁĄCZONY 📡" : "WYŁĄCZONY 🌐"}{/cyan}\n\nNaciśnij dowolny klawisz...`);
                inputBox.hide();
                screen.render();
                onDone();
                return;
            }
            inputBox.hide();
            screen.render();
            const numMap = { "1": 5, "2": 2, "3": 4, "4": 6 };
            if (numMap[input]) {
                navigate(numMap[input]);
            }
            else {
                onDone();
            }
        });
    }, 100);
}
//# sourceMappingURL=offline.js.map