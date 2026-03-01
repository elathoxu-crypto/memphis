/**
 * Memphis TUI – Main App (MemphisTUI class + widget type)
 * Bootstrap blessed, wires up keybindings, delegates rendering to screens/.
 */
import blessed from "blessed";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import os from "node:os";
import { Store } from "../memory/store.js";
import { loadConfig } from "../config/loader.js";
import type { MemphisConfig } from "../config/loader.js";
import { OpenClawBridge } from "../bridges/openclaw.js";
import { OllamaProvider } from "../providers/ollama.js";
import { OpenAIProvider } from "../providers/openai.js";

import {
  createInitialState,
  KEY_TO_SCREEN,
  SCREEN_LABELS,
  SCREEN_NAMES,
  type ScreenName,
  type TUIState,
} from "./state.js";

// ─── Screen renderers ────────────────────────────────────────────────────────
import { renderDashboard } from "./screens/dashboard.js";
import { renderJournalStatic, setupJournalInput } from "./screens/journal.js";
import { renderVaultStatic, setupVaultInput } from "./screens/vault.js";
import { renderRecallStatic, setupRecallInput } from "./screens/recall.js";
import { renderAskStatic, setupAskInput } from "./screens/ask.js";
import { renderDecisionsStatic, setupDecisionsInput } from "./screens/decisions.js";
import { renderSummaryStatic, setupSummaryInput } from "./screens/summary.js";
import { renderOpenClaw, setupOpenClawInput } from "./screens/openclaw.js";
import { renderCline, setupClineInput } from "./screens/cline.js";
import { renderOffline, setupOfflineInput } from "./screens/offline.js";
import { renderNetwork, setupNetworkInput } from "./screens/network.js";
import { renderSettings } from "./screens/settings.js";
import { renderSoulScreen } from "./screens/soul.js";

// ─── Colours ─────────────────────────────────────────────────────────────────
const COLORS = {
  primary:   "cyan",
  secondary: "magenta",
  text:      "white",
  bg:        "black",
};

// ─── Public widget bag (passed to screens that need input) ────────────────────
export interface TUIWidgets {
  screen:      blessed.Widgets.Screen;
  contentBox:  blessed.Widgets.BoxElement;
  inputBox:    blessed.Widgets.BoxElement;
  inputField:  blessed.Widgets.TextboxElement;
  statusBar:   blessed.Widgets.BoxElement;
}

// ─── Main class ──────────────────────────────────────────────────────────────
export class MemphisTUI {
  private screen:     blessed.Widgets.Screen;
  private headerBox:  blessed.Widgets.BoxElement;
  private sidebarBox: blessed.Widgets.BoxElement;
  private contentBox: blessed.Widgets.BoxElement;
  private inputBox:   blessed.Widgets.BoxElement;
  private inputField: blessed.Widgets.TextboxElement;
  private statusBar:  blessed.Widgets.BoxElement;

  private store:         Store;
  private config:        MemphisConfig;
  private openclawBridge: OpenClawBridge;
  private llmProvider:   any = null;
  private state:         TUIState;
  private statusMessage = "";

  // widgets bag re-used by all screens that need text input
  private get widgets(): TUIWidgets {
    return {
      screen:     this.screen,
      contentBox: this.contentBox,
      inputBox:   this.inputBox,
      inputField: this.inputField,
      statusBar:  this.statusBar,
    };
  }

  constructor() {
    this.config        = loadConfig();
    this.store         = new Store(this.config.memory?.path ?? `${process.env.HOME}/.memphis/chains`);
    this.openclawBridge = new OpenClawBridge();
    this.state         = createInitialState();

    this.initLLM();

    // ── terminal reset (fixes overlapping text on some terminals) ───────────
    process.stdout.write("\x1b[2J\x1b[3J\x1b[H");
    process.stderr.write("\x1b[2J\x1b[3J\x1b[H");

    // ── screen ──────────────────────────────────────────────────────────────
    this.screen = blessed.screen({ smartCSR: false, title: "Memphis – AI Brain", fullUnicode: true });

    // ── header ──────────────────────────────────────────────────────────────
    this.headerBox = blessed.box({
      top: 0, left: 0, width: "100%", height: 3,
      tags: true,
      style: { fg: COLORS.text, bg: COLORS.primary, bold: true },
      content: this.buildHeader(),
    });

    // ── sidebar ─────────────────────────────────────────────────────────────
    this.sidebarBox = blessed.box({
      top: 3, left: 0, width: "22%", height: "90%-3",
      tags: true,
      style: { fg: COLORS.text, bg: COLORS.bg, border: { fg: COLORS.primary } },
      content: this.buildSidebar(),
    });

    // ── content ─────────────────────────────────────────────────────────────
    this.contentBox = blessed.box({
      top: 3, left: "22%", width: "78%", height: "90%-3",
      tags: true, scrollable: true, alwaysScroll: true,
      style: { fg: COLORS.text, bg: COLORS.bg, border: { fg: COLORS.primary } },
      content: "",
    });

    // ── input box ───────────────────────────────────────────────────────────
    this.inputBox = blessed.box({
      bottom: 2, left: 0, width: "100%", height: 3, visible: false,
      style: { fg: COLORS.text, bg: COLORS.bg, border: { fg: COLORS.secondary } },
    });

    this.inputField = blessed.textbox({
      parent: this.inputBox,
      top: 0, left: 1, width: "98%", height: 1,
      style: { fg: COLORS.text, bg: COLORS.bg },
    });

    // ── status bar ──────────────────────────────────────────────────────────
    this.statusBar = blessed.box({
      bottom: 0, left: 0, width: "100%", height: 1,
      tags: true,
      style: { fg: COLORS.text, bg: COLORS.secondary },
      content: "",
    });

    // ── append all ──────────────────────────────────────────────────────────
    this.screen.append(this.headerBox);
    this.screen.append(this.sidebarBox);
    this.screen.append(this.contentBox);
    this.screen.append(this.inputBox);
    this.screen.append(this.statusBar);

    this.updateStatusBar();

    this.bindKeys();
    this.navigateTo("dashboard");
    this.screen.render();
  }

  private buildHeader(): string {
    const offline = this.state.offlineMode ? "{yellow}OFFLINE{/yellow}" : "{green}ONLINE{/green}";
    const llm = this.state.llmProviderName !== "none"
      ? `{green}${this.state.llmProviderName} (${this.state.selectedModel}){/green}`
      : "{red}brak{/red}";
    return `\n{center}{bold}🦅 Memphis – Local-first AI Brain{/bold}{/center}\n{center}Rola: {cyan}${this.state.activeRole}{/cyan} | LLM: ${llm} | Tryb: ${offline}{/center}`;
  }

  private updateHeader(): void {
    this.headerBox.setContent(this.buildHeader());
  }

  private buildStatusBar(extra?: string): string {
    const shortcuts = `{bold}1-9{/bold} Nawigacja | {bold}j/k{/bold} Góra/Dół | {bold}q{/bold} Wyjdź | {bold}n{/bold} Nexus | {bold}r{/bold} Rola | {bold}s{/bold} Sync | {bold}b{/bold} Backup | {bold}g{/bold} Guard | {bold}h{/bold} Help | {bold}u{/bold} USB`;
    if (!extra || extra.length === 0) {
      return shortcuts;
    }
    return `${shortcuts} {yellow}| ${extra}{/yellow}`;
  }

  private updateStatusBar(extra?: string): void {
    if (extra !== undefined) {
      this.statusMessage = extra;
    }
    const message = this.statusMessage && this.statusMessage.length ? this.statusMessage : undefined;
    this.statusBar.setContent(this.buildStatusBar(message));
  }

  private showStatus(message: string, autoReset = true): void {
    this.updateStatusBar(message);
    this.screen.render();
    if (autoReset) {
      setTimeout(() => {
        if (this.statusMessage === message) {
          this.statusMessage = "";
          this.updateStatusBar();
          this.screen.render();
        }
      }, 4000);
    }
  }

  private refreshStateUI(): void {
    this.updateHeader();
    this.refreshSidebar();
  }

  private promptInput(title: string, message: string, initial = ""): Promise<string | null> {
    return new Promise((resolve) => {
      const prompt = blessed.prompt({
        parent: this.screen,
        top: "center",
        left: "center",
        width: "70%",
        height: "shrink",
        tags: true,
        border: "line",
        label: ` ${title} `,
        style: { fg: COLORS.text, bg: COLORS.bg, border: { fg: COLORS.primary } },
      });

      prompt.input(`${message}\n> `, initial, (_err: unknown, value: unknown) => {
        prompt.destroy();
        this.screen.render();
        resolve(typeof value === "string" && value.trim().length ? value.trim() : null);
      });
    });
  }

  private async logOpsEntry(content: string, tags: string[]): Promise<void> {
    try {
      await this.store.appendBlock("ops", {
        type: "ops",
        content,
        tags,
        agent: this.state.activeRole,
      });
    } catch (error) {
      this.showStatus(`Błąd logowania ops: ${(error as Error).message}`, false);
    }
  }

  private setTimestamp(field: "lastSync" | "lastBackup"): string {
    const iso = new Date().toISOString();
    if (field === "lastSync") {
      this.state.lastSync = iso;
    } else {
      this.state.lastBackup = iso;
    }
    return iso;
  }

  private readSnippet(file: string, limit = 400): string | null {
    try {
      if (!existsSync(file)) return null;
      const text = readFileSync(file, "utf-8");
      return text.length > limit ? `${text.slice(0, limit)}…` : text;
    } catch (error) {
      return `Nie mogę odczytać ${file}: ${(error as Error).message}`;
    }
  }

  private detectUsbPath(): string | null {
    const defaultPath = "/mnt/usb";
    if (existsSync(defaultPath) && statSync(defaultPath).isDirectory()) {
      return defaultPath;
    }
    const mediaRoot = join("/media", os.userInfo().username);
    if (existsSync(mediaRoot) && statSync(mediaRoot).isDirectory()) {
      const entries = readdirSync(mediaRoot).filter((entry) => {
        const full = join(mediaRoot, entry);
        return statSync(full).isDirectory();
      });
      if (entries.length > 0) {
        return join(mediaRoot, entries[0]);
      }
    }
    return null;
  }

  // ─── LLM init ──────────────────────────────────────────────────────────────
  private initLLM(): void {
    const ollamaCfg = this.config.providers?.ollama;
    if (ollamaCfg) {
      const p = new OllamaProvider();
      if (p.isConfigured()) {
        this.llmProvider = p;
        this.state.llmProviderName = "Ollama";
        return;
      }
    }
    const openaiCfg = this.config.providers?.openai;
    if (openaiCfg?.api_key || process.env.OPENAI_API_KEY) {
      const p = new OpenAIProvider();
      if (p.isConfigured()) {
        this.llmProvider = p;
        this.state.llmProviderName = "OpenAI";
        return;
      }
    }
    this.state.llmProviderName = "none";
  }

  // ─── Keybindings ───────────────────────────────────────────────────────────
  private bindKeys(): void {
    this.screen.key(["escape", "q", "C-c"], () => process.exit(0));

    // Navigation keys
    this.screen.key(["1","2","3","4","5","6","7","8","9","0","-","=","+"], (ch: string) => {
      const name = KEY_TO_SCREEN[ch];
      if (name) this.navigateTo(name);
    });

    // Shortcut aliases
    this.screen.key(["c"], () => this.navigateTo("cline"));
    this.screen.key(["o"], () => this.navigateTo("offline"));

    // Quick actions
    this.screen.key(["n"], () => void this.handleNexusEcho());
    this.screen.key(["r"], () => void this.handleRoleSwitch());
    this.screen.key(["s"], () => void this.handleSyncChains());
    this.screen.key(["b"], () => void this.handleBackupChains());
    this.screen.key(["g"], () => void this.handleGuardedTerminal());
    this.screen.key(["h"], () => void this.handleHelpViewer());
    this.screen.key(["u"], () => void this.handleUsbMode());

    // Vim-style navigation
    this.screen.key(["j", "down"], () => this.moveMenu(1));
    this.screen.key(["k", "up"],   () => this.moveMenu(-1));

    this.screen.key(["enter"], () => this.navigateTo(this.state.currentScreen));
  }

  private moveMenu(delta: number): void {
    const idx = SCREEN_NAMES.indexOf(this.state.currentScreen);
    const next = Math.min(Math.max(idx + delta, 0), SCREEN_NAMES.length - 1);
    if (next !== idx) this.navigateTo(SCREEN_NAMES[next]);
  }

  // ─── Sidebar ───────────────────────────────────────────────────────────────
  private buildSidebar(): string {
    const keyMap: Record<number, string> = {
      1: "1", 2: "2", 3: "3", 4: "4", 5: "5",
      6: "6", 7: "7", 8: "8", 9: "9", 10: "0", 11: "-", 12: "=", 13: "+",
    };
    const nameMap: Record<number, ScreenName> = {
      1: "dashboard", 2: "journal", 3: "vault", 4: "recall", 5: "ask",
      6: "openclaw", 7: "cline", 8: "offline", 9: "network", 10: "summary",
      11: "decisions", 12: "settings", 13: "soul",
    };

    let content = `{bold}Nawigacja{/bold}\n\n`;
    let i = 1;
    for (const name of SCREEN_NAMES) {
      const active = this.state.currentScreen === name;
      const prefix = active ? "{cyan}▶{/cyan} " : "  ";
      const key = keyMap[i] || "?";
      content += `${prefix}${key}. ${SCREEN_LABELS[name]}\n`;
      i++;
    }

    content += `\n\n{bold}Quick Stats{/bold}\n`;
    const chains = this.store.listChains();
    content += `Łańcuchy: ${chains.length}\n`;
    for (const chain of chains) {
      const stats = this.store.getChainStats(chain);
      content += `  ${chain}: ${stats.blocks} bl.\n`;
    }

    content += `\nRola: ${this.state.activeRole}\n`;
    content += `Guard: ${this.state.guardedMode}\n`;
    content += `Sync: ${this.state.lastSync ?? "-"}\n`;
    content += `Backup: ${this.state.lastBackup ?? "-"}\n`;
    content += `USB: ${this.state.usbStatus}\n`;

    const llmOk = this.state.llmProviderName !== "none";
    content += `\nLLM: ${llmOk ? `{green}${this.state.llmProviderName}{/green}` : "{red}brak{/red}"}\n`;
    content += `Offline: ${this.state.offlineMode ? "{yellow}tak{/yellow}" : "{green}nie{/green}"}`;

    return content;
  }

  private refreshSidebar(): void {
    this.sidebarBox.setContent(this.buildSidebar());
  }

  // ─── Navigation ────────────────────────────────────────────────────────────
  public navigateTo(name: ScreenName): void {
    this.state.currentScreen = name;
    this.refreshSidebar();

    // Reset input box before each screen render
    this.inputBox.hide();
    this.inputField.setValue("");

    const onDone = () => this.screen.render();

    switch (name) {
      case "dashboard":
        this.contentBox.setContent(renderDashboard(this.store, this.config, this.state));
        break;

      case "journal":
        this.contentBox.setContent(renderJournalStatic());
        setupJournalInput(this.store, this.widgets, onDone);
        break;

      case "vault":
        this.contentBox.setContent(renderVaultStatic());
        setupVaultInput(this.store, this.widgets, onDone);
        break;

      case "recall":
        this.contentBox.setContent(renderRecallStatic());
        setupRecallInput(this.store, this.widgets, onDone);
        break;

      case "ask":
        this.contentBox.setContent(renderAskStatic(this.state.llmProviderName));
        setupAskInput(
          this.store, this.widgets,
          this.llmProvider, this.state.llmProviderName,
          this.state.selectedModel, onDone
        );
        break;

      case "decisions":
        this.contentBox.setContent(renderDecisionsStatic());
        setupDecisionsInput(this.store, this.widgets, onDone);
        break;

      case "summary":
        this.contentBox.setContent(renderSummaryStatic());
        setupSummaryInput(this.store, this.widgets, onDone);
        break;

      case "openclaw":
        this.contentBox.setContent(renderOpenClaw(this.openclawBridge));
        setupOpenClawInput(this.store, this.openclawBridge, this.widgets, onDone);
        break;

      case "cline":
        this.contentBox.setContent(renderCline(this.store));
        setupClineInput(this.store, this.widgets, onDone);
        break;

      case "offline":
        this.contentBox.setContent(renderOffline(this.store, this.state));
        setupOfflineInput(this.store, this.widgets, this.state, (n) => {
          const nameByNum: Record<number, ScreenName> = {
            2: "journal", 4: "recall", 5: "ask", 6: "openclaw",
          };
          if (nameByNum[n]) this.navigateTo(nameByNum[n]);
        }, onDone);
        break;

      case "network":
        this.contentBox.setContent(renderNetwork(this.store, this.state));
        setupNetworkInput(this.store, this.widgets, this.state, (name) => this.navigateTo(name), onDone);
        break;

      case "settings":
        this.contentBox.setContent(renderSettings(this.config, this.state));
        break;

      case "soul":
        this.contentBox.setContent(renderSoulScreen(process.env.MEMPHIS_WORKSPACE));
        break;
    }

    this.screen.render();
  }

  private async handleNexusEcho(): Promise<void> {
    const value = await this.promptInput(
      "Nexus Echo",
      "Wpisz tekst/poemat. Zostanie zapisany do journalu z tagiem nexus."
    );
    if (!value) {
      this.showStatus("Nexus Echo anulowany");
      return;
    }

    const header = `[Nexus Echo | ${new Date().toISOString()} | rola: ${this.state.activeRole}]`;
    try {
      const block = await this.store.appendBlock("journal", {
        type: "journal",
        content: `${header}\n\n${value}`,
        tags: ["nexus", "echo"],
        agent: this.state.activeRole,
      });
      this.contentBox.setContent(
        `{bold}Nexus Echo zapisany{/bold}\nŁańcuch: journal#${String(block.index).padStart(6, "0")}\n\n${value}`
      );
      this.showStatus("Dodano Nexus Echo");
      this.refreshStateUI();
      this.screen.render();
    } catch (error) {
      this.showStatus(`Błąd Nexus Echo: ${(error as Error).message}`, false);
    }
  }

  private async handleRoleSwitch(): Promise<void> {
    const choice = await this.promptInput(
      "Role Switcher",
      "Wybierz rolę:\n1) Operator – Codex\n2) Ingester – Grok\n3) Advisor – o3",
      "1"
    );
    if (!choice) {
      this.showStatus("Rola bez zmian");
      return;
    }
    const mapping: Record<string, { role: TUIState["activeRole"]; hint: string }> = {
      "1": { role: "operator", hint: "Codex" },
      "2": { role: "ingester", hint: "Grok" },
      "3": { role: "advisor", hint: "o3" },
    };
    const target = mapping[choice];
    if (!target) {
      this.showStatus("Nieznana rola");
      return;
    }
    this.state.activeRole = target.role;
    await this.logOpsEntry(`[Role] Przełączono na ${target.role}`, ["role", "tui"]);
    this.refreshStateUI();
    this.showStatus(`Aktywna rola: ${target.role} (${target.hint})`);
  }

  private async handleSyncChains(): Promise<void> {
    await this.logOpsEntry(
      `[Sync] Chains synced via TUI @ ${new Date().toISOString()}`,
      ["sync", "tui"]
    );
    const iso = this.setTimestamp("lastSync");
    this.refreshStateUI();
    this.contentBox.setContent(`{bold}Sync zapisany{/bold}\n${iso}`);
    this.showStatus("Sync zarejestrowany");
    this.screen.render();
  }

  private async handleBackupChains(): Promise<void> {
    await this.logOpsEntry(
      `[Backup] Memphis backup checkpoint @ ${new Date().toISOString()}`,
      ["backup", "tui"]
    );
    const iso = this.setTimestamp("lastBackup");
    this.refreshStateUI();
    this.contentBox.setContent(`{bold}Backup zapisany{/bold}\n${iso}`);
    this.showStatus("Backup zarejestrowany");
    this.screen.render();
  }

  private async handleGuardedTerminal(): Promise<void> {
    const order = ["locked", "armed", "open"] as const;
    const idx = order.indexOf(this.state.guardedMode as (typeof order)[number]);
    const next = order[(idx + 1) % order.length];
    this.state.guardedMode = next;
    await this.logOpsEntry(
      `[Guard] Guarded terminal -> ${next}`,
      ["guard", "tui"]
    );
    this.refreshStateUI();
    const instructions =
      next === "locked"
        ? "Zablokowany. Odblokuj przez Vault zanim odpalisz polecenia root."
        : next === "armed"
        ? "Uzbrojony – upewnij się, że masz vault password w VAULT_PASSWORD."
        : "OPEN – możesz uruchomić guarded-terminal.sh (shell z logowaniem).";
    this.contentBox.setContent(
      `{bold}Guarded Terminal{/bold}\nTryb: ${next}\n\n${instructions}\n\nKażde przejście logowane w chain \"ops\".`
    );
    this.showStatus(`Guarded terminal: ${next}`);
    this.screen.render();
  }

  private handleHelpViewer(): void {
    const root = process.cwd();
    const sections: string[] = [];
    const readme = this.readSnippet(join(root, "README.md"), 800);
    if (readme) {
      sections.push(`{bold}README.md{/bold}\n${readme}`);
    }
    const manifest = this.readSnippet(join(root, "deployment_package_manifest.md"), 800);
    if (manifest) {
      sections.push(`{bold}deployment_package_manifest.md{/bold}\n${manifest}`);
    }
    if (sections.length === 0) {
      sections.push("Brak plików pomocy w katalogu roboczym.");
    }
    this.contentBox.setContent(sections.join("\n\n{gray}---{/gray}\n\n"));
    this.showStatus("Help viewer otwarty", false);
    this.screen.render();
  }

  private async handleUsbMode(): Promise<void> {
    const path = this.detectUsbPath();
    if (path) {
      this.state.usbStatus = `connected (${path})`;
      await this.logOpsEntry(`[USB] Verified device at ${path}`, ["usb", "tui"]);
      this.contentBox.setContent(
        `{bold}USB Mode{/bold}\nWykryto urządzenie: ${path}\n\n1. Upewnij się, że montowanie jest rw\n2. Skopiuj ZIP: Memphis_deployment_package.zip\n3. Uruchom test instalacji (usb-run)\n\nZdarzenie zapisane w chain ops.`
      );
      this.showStatus("USB wykryty");
    } else {
      this.state.usbStatus = "disconnected";
      this.contentBox.setContent(
        `{bold}USB Mode{/bold}\nNie wykryto nośnika. Podłącz dysk i upewnij się, że jest zamontowany w /mnt/usb lub /media/${os.userInfo().username}.`
      );
      this.showStatus("USB nie znaleziono");
    }
    this.refreshStateUI();
    this.screen.render();
  }

  public run(): void {
    this.screen.render();
  }
}
