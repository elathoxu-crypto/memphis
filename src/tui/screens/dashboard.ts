/**
 * Memphis TUI – Dashboard Screen
 */
import type { Store } from "../../memory/store.js";
import type { MemphisConfig } from "../../config/loader.js";
import type { TUIState } from "../state.js";
import { truncate, formatDate } from "../helpers.js";
import { buildStatusReport } from "../../core/status.js";
import { collectSoulStatus, DEFAULT_WORKSPACE_ROOT } from "../../soul/status.js";

export function renderDashboard(store: Store, config: MemphisConfig, state: TUIState): string {
  const report = buildStatusReport(store, config);
  const soul = collectSoulStatus({ workspaceRoot: process.env.MEMPHIS_WORKSPACE || DEFAULT_WORKSPACE_ROOT, touchHeartbeat: false });

  let content = `{bold}{cyan}⚡ Dashboard{/cyan}{/bold}\n\n`;
  content += `Witaj w Memphis! Twój lokalny mózg AI.\n\n`;

  content += `{bold}Status operacyjny:{/bold}\n`;
  content += `  Rola: {cyan}${state.activeRole}{/cyan}\n`;
  content += `  LLM: ${state.llmProviderName !== "none" ? `{green}${state.llmProviderName} (${state.selectedModel}){/green}` : `{red}brak{/red}`}\n`;
  content += `  Tryb: ${state.offlineMode ? `{yellow}OFFLINE{/yellow}` : `{green}ONLINE{/green}`}\n`;
  content += `  Guarded Terminal: ${state.guardedMode}\n`;
  content += `  USB: ${state.usbStatus}\n`;
  content += `  Ostatni sync: ${state.lastSync ?? "-"}\n`;
  content += `  Ostatni backup: ${state.lastBackup ?? "-"}\n\n`;

  // Chains with health
  content += `{bold}Łańcuchy pamięci:{/bold}\n\n`;
  if (report.chains.length === 0) {
    content += `{yellow}Brak łańcuchów pamięci.{/yellow}\n`;
  } else {
    for (const chain of report.chains) {
      let healthIcon: string;
      let healthColor: string;
      switch (chain.health) {
        case "ok":
          healthIcon = "✓";
          healthColor = "green";
          break;
        case "broken":
          healthIcon = "✗";
          healthColor = "red";
          break;
        case "empty":
          healthIcon = "·";
          healthColor = "gray";
          break;
      }
      content += `{cyan}▸ ${chain.name}{/cyan} ${healthColor}${healthIcon}{/${healthColor}} (${chain.blocks} blocks)\n`;
      if (chain.health === "broken" && chain.broken_at !== undefined) {
        content += `    {red}broken at block ${chain.broken_at}{/red}\n`;
      }
      if (chain.last) {
        content += `    Ostatni: ${formatDate(chain.last)}\n`;
      }
      content += `\n`;
    }
  }

  // Vault
  content += `{bold}Vault:{/bold}\n`;
  if (report.vault.health === "ok") {
    content += `{green}✓{/green} ${report.vault.blocks} kluczy\n`;
  } else if (report.vault.health === "not_initialized") {
    content += `{yellow}✗ nie zainicjowany{/yellow}\n`;
  } else {
    content += `{red}✗ uszkodzony{/red}\n`;
  }
  content += `\n`;

  // Providers
  content += `{bold}Providers:{/bold}\n`;
  if (report.providers.length === 0) {
    content += `{gray}Brak skonfigurowanych{/gray}\n`;
  } else {
    for (const p of report.providers) {
      let statusColor = p.health === "ready" ? "green" : "yellow";
      let statusIcon = p.health === "ready" ? "✓" : "⚠";
      content += `${p.name} (${p.model || "?"}) {${statusColor}${statusIcon}{/${statusColor}}\n`;
    }
  }
  content += `\n`;

  // SOUL summary
  const soulColor = soul.ok ? "green" : "red";
  content += `{bold}SOUL:{/bold} {${soulColor}}${soul.ok ? "OK" : "Needs attention"}{/${soulColor}}\n`;
  content += `${soul.summary}\n\n`;

  // Recent
  content += `{bold}Ostatnia aktywność:{/bold}\n`;
  if (report.recent.length === 0) {
    content += `{gray}Brak wpisów{/gray}\n`;
  } else {
    for (const r of report.recent) {
      const time = new Date(r.timestamp).toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" });
      content += `  {gray}${time}{/gray} ${r.chain} ${truncate(r.content, 50)}\n`;
    }
  }

  // Overall status
  content += `\n{bold}Status:{/bold} `;
  if (report.ok) {
    content += `{green}OK{/green}\n`;
  } else {
    content += `{red}Problemy{/red}\n`;
  }

  return content;
}
