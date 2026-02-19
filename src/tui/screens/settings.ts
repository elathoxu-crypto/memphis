/**
 * Memphis TUI – Settings Screen
 */
import type { MemphisConfig } from "../../config/loader.js";
import type { TUIState } from "../state.js";

export function renderSettings(config: MemphisConfig, state: TUIState): string {
  const providers = Object.keys(config.providers ?? {});
  const providerList = providers.length > 0
    ? providers.map(p => `  {cyan}• ${p}{/cyan}`).join("\n")
    : "  {yellow}Brak skonfigurowanych providerów{/yellow}";

  return (
    `{bold}{cyan}⚙️  Ustawienia{/cyan}{/bold}\n\n` +
    `{bold}Konfiguracja pamięci:{/bold}\n` +
    `  Ścieżka: {white}${config.memory?.path ?? "~/.memphis/chains"}{/white}\n\n` +
    `{bold}Providery LLM (${providers.length}):{/bold}\n` +
    `${providerList}\n\n` +
    `{bold}TUI – Stan:{/bold}\n` +
    `  Aktywny provider: {white}${state.llmProviderName}{/white}\n` +
    `  Model: {white}${state.selectedModel}{/white}\n` +
    `  Tryb offline: {white}${state.offlineMode ? "WŁĄCZONY" : "WYŁĄCZONY"}{/white}\n\n` +
    `{yellow}Edytor ustawień: wkrótce!{/yellow}\n` +
    `{gray}Plik konfiguracji: ~/.memphis/config.yaml{/gray}\n`
  );
}
