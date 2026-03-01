/**
 * Memphis TUI – Dashboard Screen
 */
import type { Store } from "../../memory/store.js";
import type { MemphisConfig } from "../../config/loader.js";
import type { TUIState } from "../state.js";
import { truncate, formatDate } from "../helpers.js";
import { buildStatusReport } from "../../core/status.js";
import { collectSoulStatus, DEFAULT_WORKSPACE_ROOT } from "../../soul/status.js";
import { checkTimeTriggers } from "../../intelligence/suggestions.js";

export function renderDashboard(store: Store, config: MemphisConfig, state: TUIState): string {
  const report = buildStatusReport(store, config);
  const soul = collectSoulStatus({ workspaceRoot: process.env.MEMPHIS_WORKSPACE || DEFAULT_WORKSPACE_ROOT, touchHeartbeat: false });

  // Update suggestions based on time triggers
  try {
    const journalChain = store.readChain('journal');
    const lastBlock = journalChain[journalChain.length - 1];
    const lastJournalTime = lastBlock?.timestamp ? new Date(lastBlock.timestamp).getTime() : 0;

    // Only update if enough time has passed (avoid constant recalculation)
    if (!state.lastJournalTime || Math.abs(lastJournalTime - state.lastJournalTime) > 60000) {
      state.lastJournalTime = lastJournalTime;
      state.activeSuggestions = checkTimeTriggers(lastJournalTime);
    }
  } catch (err: any) {
    // Graceful fallback if suggestions module not available
    console.error('Suggestions error:', err.message);
  }

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

  // Intelligence Widget
  content += `{bold}Intelligence:{/bold}\n`;
  try {
    const fs = require('fs');
    const path = require('path');
    const learningPath = path.join(process.env.MEMPHIS_PATH || path.join(process.env.HOME || '', '.memphis'), 'intelligence', 'learning-data.json');
    
    if (fs.existsSync(learningPath)) {
      const learning = JSON.parse(fs.readFileSync(learningPath, 'utf-8'));
      const totalFeedback = Object.values(learning.acceptedPatterns || {}).reduce((sum: number, n) => sum + (n as number), 0) +
                           Object.values(learning.rejectedPatterns || {}).reduce((sum: number, n) => sum + (n as number), 0);
      
      const topTags = Object.entries(learning.acceptedPatterns || {})
        .sort((a, b) => ((b[1] as number) || 0) - ((a[1] as number) || 0))
        .slice(0, 3);
      
      if (totalFeedback > 0) {
        content += `  {green}✓ Active{/green} (${totalFeedback} feedback events)\n`;
        if (topTags.length > 0) {
          content += `  Top: ${topTags.map(([tag, count]) => `${tag}(${count})`).join(', ')}\n`;
        }
      } else {
        content += `  {yellow}Learning (no feedback yet){/yellow}\n`;
      }
    } else {
      content += `  {gray}Not initialized{/gray}\n`;
    }
  } catch (err) {
    content += `  {gray}—{/gray}\n`;
  }
  content += `\n`;

  // Suggestions Widget (Time-Based)
  if (state.activeSuggestions && state.activeSuggestions.length > 0) {
    content += `{bold}💡 Suggestions:{/bold}\n`;
    for (const suggestion of state.activeSuggestions) {
      const icons = {
        journal: '📝',
        reflect: '💭',
        summarize: '📊'
      };
      const icon = icons[suggestion.type];
      const priorityColor = {
        high: 'red',
        medium: 'yellow',
        low: 'gray'
      }[suggestion.priority];

      content += `  {${priorityColor}}${icon} ${suggestion.message}{/${priorityColor}}\n`;
    }
    content += `\n`;
  }

  // Overall status
  content += `{bold}Status:{/bold} `;
  if (report.ok) {
    content += `{green}OK{/green}\n`;
  } else {
    content += `{red}Problemy{/red}\n`;
  }

  return content;
}
