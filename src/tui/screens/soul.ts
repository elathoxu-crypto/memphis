import { collectSoulStatus, DEFAULT_WORKSPACE_ROOT } from "../../soul/status.js";

export function renderSoulScreen(workspaceRoot?: string): string {
  const report = collectSoulStatus({ workspaceRoot: workspaceRoot || DEFAULT_WORKSPACE_ROOT, touchHeartbeat: false });

  let content = `{bold}{magenta}SOUL Status{/magenta}{/bold}\n\n`;
  content += `Workspace: ${report.workspaceRoot}\n`;
  content += `Agent: ${report.identity.agent}\n`;
  content += `SOUL hash: ${report.identity.soulHash ?? "-"}\n`;
  content += `SOUL updated: ${report.identity.soulUpdated ?? "-"}\n\n`;

  content += `{bold}Signals{/bold}\n`;
  for (const signal of Object.values(report.signals)) {
    const color = signal.status === "ok" ? "green" : signal.status === "warn" ? "yellow" : "red";
    content += `  {${color}}${signal.label}{/${color}} — ${signal.detail ?? signal.status}\n`;
  }

  content += `\n{bold}Tasks{/bold}\n`;
  if (report.queue.length === 0) {
    content += `  (brak)\n`;
  } else {
    for (const entry of report.queue) {
      const prefix = entry.done ? "{green}[x]{/green}" : "{yellow}[ ]{/yellow}";
      content += `  ${prefix} ${entry.text}\n`;
    }
  }

  content += `\n{bold}Alerts{/bold}\n`;
  if (report.alerts.length === 0) {
    content += `  {green}Brak alertów{/green}\n`;
  } else {
    for (const alert of report.alerts) {
      const color = alert.severity === "critical" ? "red" : "yellow";
      content += `  {${color}}• ${alert.message}{/${color}}\n`;
    }
  }

  content += `\n${report.summary}\n`;
  return content;
}
