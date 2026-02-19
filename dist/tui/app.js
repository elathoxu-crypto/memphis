/**
 * Memphis TUI – Main App (MemphisTUI class + widget type)
 * Bootstrap blessed, wires up keybindings, delegates rendering to screens/.
 */
import blessed from "blessed";
import { Store } from "../memory/store.js";
import { loadConfig } from "../config/loader.js";
import { OpenClawBridge } from "../bridges/openclaw.js";
import { OllamaProvider } from "../providers/ollama.js";
import { OpenAIProvider } from "../providers/openai.js";
import { createInitialState, KEY_TO_SCREEN, SCREEN_LABELS, SCREEN_NAMES, } from "./state.js";
// ─── Screen renderers ────────────────────────────────────────────────────────
import { renderDashboard } from "./screens/dashboard.js";
import { renderJournalStatic, setupJournalInput } from "./screens/journal.js";
import { renderVaultStatic, setupVaultInput } from "./screens/vault.js";
import { renderRecallStatic, setupRecallInput } from "./screens/recall.js";
import { renderAskStatic, setupAskInput } from "./screens/ask.js";
import { renderOpenClaw, setupOpenClawInput } from "./screens/openclaw.js";
import { renderCline, setupClineInput } from "./screens/cline.js";
import { renderOffline, setupOfflineInput } from "./screens/offline.js";
import { renderSettings } from "./screens/settings.js";
// ─── Colours ─────────────────────────────────────────────────────────────────
const COLORS = {
    primary: "cyan",
    secondary: "magenta",
    text: "white",
    bg: "black",
};
// ─── Main class ──────────────────────────────────────────────────────────────
export class MemphisTUI {
    screen;
    headerBox;
    sidebarBox;
    contentBox;
    inputBox;
    inputField;
    statusBar;
    store;
    config;
    openclawBridge;
    llmProvider = null;
    state;
    // widgets bag re-used by all screens that need text input
    get widgets() {
        return {
            screen: this.screen,
            contentBox: this.contentBox,
            inputBox: this.inputBox,
            inputField: this.inputField,
            statusBar: this.statusBar,
        };
    }
    constructor() {
        this.config = loadConfig();
        this.store = new Store(this.config.memory?.path ?? `${process.env.HOME}/.memphis/chains`);
        this.openclawBridge = new OpenClawBridge();
        this.state = createInitialState();
        this.initLLM();
        // ── screen ──────────────────────────────────────────────────────────────
        this.screen = blessed.screen({ smartCSR: true, title: "Memphis – AI Brain", fullUnicode: true });
        // ── header ──────────────────────────────────────────────────────────────
        this.headerBox = blessed.box({
            top: 0, left: 0, width: "100%", height: 3,
            tags: true,
            style: { fg: COLORS.text, bg: COLORS.primary, bold: true },
            content: `{center}{bold}🦅 Memphis – Local-first AI Brain  {bold}Nawal E Theme{/bold}{/bold}{/center}`,
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
            content: `{bold}1-9{/bold} Nawigacja | {bold}j/k{/bold} Góra/Dół | {bold}q{/bold} Wyjdź`,
        });
        // ── append all ──────────────────────────────────────────────────────────
        this.screen.append(this.headerBox);
        this.screen.append(this.sidebarBox);
        this.screen.append(this.contentBox);
        this.screen.append(this.inputBox);
        this.screen.append(this.statusBar);
        this.bindKeys();
        this.navigateTo("dashboard");
        this.screen.render();
    }
    // ─── LLM init ──────────────────────────────────────────────────────────────
    initLLM() {
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
    bindKeys() {
        this.screen.key(["escape", "q", "C-c"], () => process.exit(0));
        // Number keys 1-9
        this.screen.key(["1", "2", "3", "4", "5", "6", "7", "8", "9"], (ch) => {
            const name = KEY_TO_SCREEN[ch];
            if (name)
                this.navigateTo(name);
        });
        // Shortcut aliases
        this.screen.key(["c"], () => this.navigateTo("cline"));
        this.screen.key(["o"], () => this.navigateTo("offline"));
        // Vim-style navigation
        this.screen.key(["j", "down"], () => this.moveMenu(1));
        this.screen.key(["k", "up"], () => this.moveMenu(-1));
        this.screen.key(["enter"], () => this.navigateTo(this.state.currentScreen));
    }
    moveMenu(delta) {
        const idx = SCREEN_NAMES.indexOf(this.state.currentScreen);
        const next = Math.min(Math.max(idx + delta, 0), SCREEN_NAMES.length - 1);
        if (next !== idx)
            this.navigateTo(SCREEN_NAMES[next]);
    }
    // ─── Sidebar ───────────────────────────────────────────────────────────────
    buildSidebar() {
        let content = `{bold}Nawigacja{/bold}\n\n`;
        let i = 1;
        for (const name of SCREEN_NAMES) {
            const active = this.state.currentScreen === name;
            const prefix = active ? "{cyan}▶{/cyan} " : "  ";
            content += `${prefix}${i}. ${SCREEN_LABELS[name]}\n`;
            i++;
        }
        content += `\n\n{bold}Quick Stats{/bold}\n`;
        const chains = this.store.listChains();
        content += `Łańcuchy: ${chains.length}\n`;
        for (const chain of chains) {
            const stats = this.store.getChainStats(chain);
            content += `  ${chain}: ${stats.blocks} bl.\n`;
        }
        const llmOk = this.state.llmProviderName !== "none";
        content += `\nLLM: ${llmOk ? `{green}${this.state.llmProviderName}{/green}` : "{red}brak{/red}"}\n`;
        content += `Offline: ${this.state.offlineMode ? "{yellow}tak{/yellow}" : "{green}nie{/green}"}`;
        return content;
    }
    refreshSidebar() {
        this.sidebarBox.setContent(this.buildSidebar());
    }
    // ─── Navigation ────────────────────────────────────────────────────────────
    navigateTo(name) {
        this.state.currentScreen = name;
        this.refreshSidebar();
        // Reset input box before each screen render
        this.inputBox.hide();
        this.inputField.setValue("");
        const onDone = () => this.screen.render();
        switch (name) {
            case "dashboard":
                this.contentBox.setContent(renderDashboard(this.store));
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
                setupAskInput(this.store, this.widgets, this.llmProvider, this.state.llmProviderName, this.state.selectedModel, onDone);
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
                    const nameByNum = {
                        2: "journal", 4: "recall", 5: "ask", 6: "openclaw",
                    };
                    if (nameByNum[n])
                        this.navigateTo(nameByNum[n]);
                }, onDone);
                break;
            case "settings":
                this.contentBox.setContent(renderSettings(this.config, this.state));
                break;
        }
        this.screen.render();
    }
    run() {
        this.screen.render();
    }
}
//# sourceMappingURL=app.js.map