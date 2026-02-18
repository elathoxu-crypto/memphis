#!/usr/bin/env node
/**
 * Memphis TUI - Main Entry Point
 * Refactored with modular structure
 *
 * Refactoring:
 * 1. Magic numbers extracted to constants.ts
 * 2. Helper functions moved to helpers.ts
 * 3. UI components factored to components.ts
 * 4. Better error handling throughout
 */
import { Store } from "../memory/store.js";
import { loadConfig } from "../config/loader.js";
import { queryBlocks } from "../memory/query.js";
import { encrypt } from "../utils/crypto.js";
import { OpenClawBridge } from "../bridges/openclaw.js";
import { OllamaProvider } from "../providers/ollama.js";
import { OpenAIProvider } from "../providers/openai.js";
// Components (UI factories)
import { createScreen, createHeaderBox, createSidebarBox, createContentBox, createInputBox, createInputField, createStatusBar, applyKeyBindings, setBoxContent, setInputBoxVisible, focusInput, setInputPlaceholder, clearInput, readInput, renderScreen, } from "./components.js";
// Constants
import { MENU, NAV_ITEMS, LIMITS, DEFAULT_MODELS, STATUS_MESSAGES, TIMING, } from "./constants.js";
// Helpers
import { safeAsync, safeSync, validateInput, truncateContent, formatSearchResults, formatSuccess, formatError, formatWarning, buildLLMMessages, sleep, } from "./helpers.js";
/**
 * Memphis TUI - Main Class
 * Refactored version with better organization and error handling
 */
export class MemphisTUI {
    // Core dependencies
    store;
    config;
    openclawBridge;
    // LLM Provider
    llmProvider = null;
    llmProviderName = "";
    // UI State
    currentScreen = "dashboard";
    inputMode = "";
    // UI Elements
    screen;
    headerBox;
    sidebarBox;
    contentBox;
    inputBox;
    inputField;
    statusBar;
    constructor() {
        // Initialize core dependencies with error handling
        const configResult = safeSync(() => loadConfig(), "Failed to load config");
        if (!configResult.success || !configResult.data) {
            console.error("Failed to load config:", configResult.error);
            process.exit(1);
        }
        this.config = configResult.data;
        this.store = new Store(this.config.memory?.path || `${process.env.HOME}/.memphis/chains`);
        this.openclawBridge = new OpenClawBridge();
        // Initialize LLM provider
        this.initLLM();
        // Create UI
        this.screen = createScreen();
        this.headerBox = createHeaderBox(this.screen);
        this.sidebarBox = createSidebarBox(this.screen, this.getSidebarContent());
        this.contentBox = createContentBox(this.screen);
        this.inputBox = createInputBox(this.screen);
        this.inputField = createInputField(this.inputBox);
        this.statusBar = createStatusBar(this.screen, STATUS_MESSAGES.QUIT_HINT);
        // Setup key bindings
        this.setupKeyBindings();
        // Initial render
        this.renderDashboard();
        renderScreen(this.screen);
    }
    /**
     * Initialize LLM provider with fallback
     */
    initLLM() {
        // Try Ollama first (local, free)
        const ollamaConfig = this.config.providers?.ollama;
        if (ollamaConfig) {
            this.llmProvider = new OllamaProvider();
            this.llmProviderName = "Ollama";
            if (this.llmProvider.isConfigured()) {
                console.log("🤖 TUI: Using Ollama for LLM");
                return;
            }
        }
        // Try OpenAI as fallback
        const openaiConfig = this.config.providers?.openai;
        if (openaiConfig?.api_key || process.env.OPENAI_API_KEY) {
            this.llmProvider = new OpenAIProvider();
            this.llmProviderName = "OpenAI";
            if (this.llmProvider.isConfigured()) {
                console.log("🤖 TUI: Using OpenAI for LLM");
                return;
            }
        }
        console.log("⚠️ TUI: No LLM provider configured");
    }
    /**
     * Setup keyboard bindings
     */
    setupKeyBindings() {
        applyKeyBindings(this.screen, {
            onQuit: () => process.exit(0),
            onNavigation: (direction) => this.handleNavigation(direction),
            onEnter: () => this.handleEnter(),
            onNumber: (num) => this.navigateToMenu(num),
            onChar: (char) => this.handleCharKey(char),
        });
    }
    /**
     * Handle character key presses
     */
    handleCharKey(char) {
        switch (char) {
            case "c":
                this.navigateToMenu(MENU.CLINE);
                break;
            case "o":
                this.navigateToMenu(MENU.OFFLINE);
                break;
            case "j":
                this.handleNavigation("down");
                break;
            case "k":
                this.handleNavigation("up");
                break;
        }
    }
    /**
     * Handle arrow key navigation
     */
    handleNavigation(direction) {
        const menuItems = ["dashboard", "journal", "vault", "recall", "ask", "openclaw", "cline", "offline", "settings"];
        const currentIndex = menuItems.indexOf(this.currentScreen);
        let newIndex = currentIndex;
        if (direction === "down")
            newIndex = Math.min(currentIndex + 1, menuItems.length - 1);
        if (direction === "up")
            newIndex = Math.max(currentIndex - 1, 0);
        if (newIndex !== currentIndex) {
            this.navigateToMenu(newIndex + 1);
        }
    }
    /**
     * Handle enter key
     */
    handleEnter() {
        this.navigateToMenu(this.getCurrentMenuIndex());
    }
    /**
     * Get current menu index
     */
    getCurrentMenuIndex() {
        const menuMap = {
            dashboard: MENU.DASHBOARD,
            journal: MENU.JOURNAL,
            vault: MENU.VAULT,
            recall: MENU.RECALL,
            ask: MENU.ASK,
            openclaw: MENU.OPENCLAW,
            cline: MENU.CLINE,
            offline: MENU.OFFLINE,
            settings: MENU.SETTINGS,
        };
        return menuMap[this.currentScreen] || MENU.DASHBOARD;
    }
    /**
     * Get sidebar content - Nawal E Style 🦅
     */
    getSidebarContent() {
        let content = `{bold}{yellow}⬡ NAWIGACJA{/yellow}{/bold}\n\n`;
        NAV_ITEMS.forEach((item) => {
            const prefix = this.currentScreen === item.key ? "{yellow}›{/yellow} " : "  ";
            const icon = item.key === 'dashboard' ? '⌂' :
                item.key === 'journal' ? '✎' :
                    item.key === 'vault' ? '🔐' :
                        item.key === 'recall' ? '🔍' :
                            item.key === 'ask' ? '💭' :
                                item.key === 'openclaw' ? '🦅' :
                                    item.key === 'cline' ? '🤖' :
                                        item.key === 'offline' ? '📴' : '⚙';
            content += `${prefix}{white}${icon} ${item.label}{/white}\n`;
        });
        // Quick Stats
        const chains = this.store.listChains();
        let totalBlocks = 0;
        chains.forEach(chain => {
            const stats = this.store.getChainStats(chain);
            totalBlocks += stats.blocks;
        });
        content += `\n{bold}{cyan}⬡ STATYSTYKI{/cyan}{/bold}\n`;
        content += `{yellow}────────────────────────────────{/yellow}\n`;
        content += ` {cyan}Łańcuchy:{/cyan} ${chains.length}\n`;
        content += ` {cyan}Bloki:{/cyan} ${totalBlocks}\n`;
        chains.forEach((chain) => {
            const stats = this.store.getChainStats(chain);
            const icon = chain === 'vault' ? '🔐' : '📝';
            content += `   ${icon} ${chain}: ${stats.blocks}\n`;
        });
        // Memphis quote
        content += `\n{bold}{yellow}⬡ MYŚĆ DNIA{/yellow}{/bold}\n`;
        content += `{yellow}────────────────────────────────{/yellow}\n`;
        content += `{white}"Łączę to co było{/white}\n`;
        content += `{white}z tym co będzie."{/white}\n`;
        return content;
    }
    /**
     * Navigate to menu by number
     */
    navigateToMenu(num) {
        switch (num) {
            case MENU.DASHBOARD:
                this.renderDashboard();
                break;
            case MENU.JOURNAL:
                this.renderJournal();
                break;
            case MENU.VAULT:
                this.renderVault();
                break;
            case MENU.RECALL:
                this.renderRecall();
                break;
            case MENU.ASK:
                this.renderAsk();
                break;
            case MENU.OPENCLAW:
                this.renderOpenClaw();
                break;
            case MENU.CLINE:
                this.renderCline();
                break;
            case MENU.OFFLINE:
                this.renderOffline();
                break;
            case MENU.SETTINGS:
                this.renderSettings();
                break;
        }
        renderScreen(this.screen);
    }
    /**
     * Update content and sidebar
     */
    updateContent(content) {
        setBoxContent(this.contentBox, content);
        setBoxContent(this.sidebarBox, this.getSidebarContent());
    }
    // ============================================
    // SCREEN RENDERERS
    // ============================================
    /**
     * Render dashboard - Nawal E Style 🦅
     */
    renderDashboard() {
        this.currentScreen = "dashboard";
        const chains = this.store.listChains();
        // Nawal E Header
        let content = `{bold}{yellow}╔═══════════════════════════════════════════════╗{/yellow}{/bold}\n`;
        content += `{bold}{yellow}║     🦅 MEMPHIS - Przewodnik i Katalizator    ║{/yellow}{/bold}\n`;
        content += `{bold}{yellow}╚═══════════════════════════════════════════════╝{/yellow}{/bold}\n\n`;
        if (chains.length === 0) {
            content += formatWarning(STATUS_MESSAGES.NO_CHAINS);
        }
        else {
            // Chain stats
            content += `{bold}{cyan}📦 Łańcuchy Pamięci:{/cyan}{/bold}\n`;
            content += `{yellow}────────────────────────────────────────────{/yellow}\n\n`;
            chains.forEach((chain) => {
                const stats = this.store.getChainStats(chain);
                const icon = chain === 'vault' ? '🔐' : '📝';
                content += `{bold}${icon} ${chain.toUpperCase()}{/bold}\n`;
                content += `   {cyan}Bloki:{/cyan} ${stats.blocks}\n`;
                content += `   {cyan}Od:{/cyan} ${stats.first ? stats.first.split('T')[0] : 'N/A'}\n`;
                content += `   {cyan}Do:{/cyan} ${stats.last ? stats.last.split('T')[0] : 'N/A'}\n\n`;
            });
            // Recent activity
            content += `{bold}{cyan}📜 Ostatnia Aktywność:{/cyan}{/bold}\n`;
            content += `{yellow}────────────────────────────────────────────{/yellow}\n`;
            chains.slice(0, LIMITS.RECENT_BLOCKS).forEach((chain) => {
                const blocks = this.store.readChain(chain);
                if (blocks.length > 0) {
                    const lastBlock = blocks[blocks.length - 1];
                    const preview = truncateContent(lastBlock.data?.content, LIMITS.CONTENT_PREVIEW_SHORT);
                    content += `  {yellow}›{/yellow} ${chain}: ${preview}\n`;
                }
            });
        }
        // Quick actions
        content += `\n{bold}{yellow}⚡ Szybkie Akcje:{/yellow}{/bold}\n`;
        content += `{yellow}────────────────────────────────────────────{/yellow}\n`;
        content += `  {cyan}[1]{/cyan} Dashboard   {cyan}[2]{/cyan} Journal   {cyan}[3]{/cyan} Vault\n`;
        content += `  {cyan}[4]{/cyan} Recall     {cyan}[5]{/cyan} Ask       {cyan}[c]{/cyan} Cline\n`;
        this.updateContent(content);
    }
    /**
     * Render journal screen
     */
    renderJournal() {
        this.currentScreen = "journal";
        let content = `{bold}{cyan} Journal Entry{/cyan}{/bold}\n\n`;
        content += `Add a new entry to your memory.\n\n`;
        content += `{white}${STATUS_MESSAGES.PRESS_ANY_KEY}{/white}\n`;
        this.updateContent(content);
        // Show input after delay
        sleep(TIMING.INPUT_DELAY_MS).then(() => {
            this.inputMode = "journal";
            setInputBoxVisible(this.inputBox, true);
            setInputPlaceholder(this.inputField, "What's on your mind?");
            focusInput(this.inputField);
            readInput(this.inputField, (err, value) => {
                if (err) {
                    const errorMessage = err instanceof Error ? err.message : String(err);
                    this.handleInputError(errorMessage);
                    return;
                }
                const validation = validateInput(value);
                if (!validation.valid) {
                    this.handleInputError(validation.error || "Invalid input");
                    return;
                }
                // Add block to store
                const addResult = safeSync(() => this.store.addBlock("journal", {
                    type: "journal",
                    content: value.trim(),
                    tags: [],
                }), "Failed to add journal entry");
                if (addResult.success) {
                    this.updateContent(formatSuccess("Entry added successfully!") + "\n\n" + STATUS_MESSAGES.PRESS_ANY_KEY);
                }
                else {
                    this.updateContent(formatError(addResult.error || "Failed to add entry") + "\n\n" + STATUS_MESSAGES.PRESS_ANY_KEY);
                }
                this.inputMode = "";
                setInputBoxVisible(this.inputBox, false);
                renderScreen(this.screen);
            });
        });
    }
    /**
     * Render recall/search screen
     */
    renderRecall() {
        this.currentScreen = "recall";
        let content = `{bold}{cyan} Recall - Search Memory{/cyan}{/bold}\n\n`;
        content += `Search through your memory chains.\n\n`;
        content += `{white}${STATUS_MESSAGES.PRESS_ANY_KEY}{/white}\n`;
        this.updateContent(content);
        sleep(TIMING.INPUT_DELAY_MS).then(() => {
            this.inputMode = "recall";
            setInputBoxVisible(this.inputBox, true);
            setInputPlaceholder(this.inputField, "Enter keyword to search...");
            focusInput(this.inputField);
            readInput(this.inputField, (err, value) => {
                if (err) {
                    const errorMessage = err instanceof Error ? err.message : String(err);
                    this.handleInputError(errorMessage);
                    return;
                }
                const validation = validateInput(value);
                if (!validation.valid) {
                    this.handleInputError(validation.error || "Invalid input");
                    return;
                }
                // Search blocks
                const results = queryBlocks(this.store, { keyword: value.trim() });
                let resultContent = formatSearchResults(results, value.trim());
                resultContent += `\n\n{white}${STATUS_MESSAGES.PRESS_ANY_KEY}{/white}`;
                this.updateContent(resultContent);
                this.inputMode = "";
                setInputBoxVisible(this.inputBox, false);
                renderScreen(this.screen);
            });
        });
    }
    /**
     * Render ask screen
     */
    renderAsk() {
        this.currentScreen = "ask";
        let content = `{bold}{cyan} Ask Memphis{/cyan}{/bold}\n\n`;
        content += `Ask a question about your memory.\n\n`;
        content += `{white}${STATUS_MESSAGES.PRESS_ANY_KEY}{/white}\n`;
        this.updateContent(content);
        sleep(TIMING.INPUT_DELAY_MS).then(() => {
            this.inputMode = "ask";
            setInputBoxVisible(this.inputBox, true);
            setInputPlaceholder(this.inputField, "What would you like to know?");
            focusInput(this.inputField);
            readInput(this.inputField, async (err, value) => {
                if (err) {
                    this.handleInputError(err instanceof Error ? err.message : "Unknown error");
                    return;
                }
                const validation = validateInput(value || "");
                if (!validation.valid) {
                    this.handleInputError(validation.error || "Invalid input");
                    return;
                }
                this.updateContent(`{bold}${STATUS_MESSAGES.THINKING}{/bold}\n`);
                renderScreen(this.screen);
                const answer = await this.askLLM(value.trim());
                let responseContent = `{bold}Question: "${value.trim()}"{/bold}\n\n`;
                responseContent += `{white}Answer:{/white}\n\n${answer}\n\n`;
                responseContent += `{gray}Provider: ${this.llmProviderName}{/gray}\n\n`;
                responseContent += `{white}${STATUS_MESSAGES.PRESS_ANY_KEY}{/white}`;
                this.updateContent(responseContent);
                this.inputMode = "";
                setInputBoxVisible(this.inputBox, false);
                renderScreen(this.screen);
            });
        });
    }
    /**
     * Ask LLM with memory context
     */
    async askLLM(question) {
        if (!this.llmProvider || !this.llmProvider.isConfigured()) {
            return formatError(STATUS_MESSAGES.NO_LLM);
        }
        // Get memory context
        const results = queryBlocks(this.store, { keyword: question, limit: LIMITS.SEARCH_RESULTS_LIMIT });
        const context = results.map((b) => b.data?.content).join("\n");
        const messages = buildLLMMessages(question, context);
        const result = await safeAsync(() => this.llmProvider.chat(messages, {
            model: this.config.providers?.ollama?.model ||
                this.config.providers?.openai?.model ||
                DEFAULT_MODELS.PRIMARY,
        }), "LLM request failed");
        if (!result.success) {
            return formatError(result.error || "Failed to get response");
        }
        return result.data?.content || "No response";
    }
    /**
     * Render settings screen
     */
    renderSettings() {
        this.currentScreen = "settings";
        let content = `{bold}{cyan} Settings{/cyan}{/bold}\n\n`;
        content += `{white}Configuration:{/white}\n\n`;
        content += `Storage Path: ${this.config.memory?.path || "~/.memphis/chains"}\n`;
        content += `Providers: ${Object.keys(this.config.providers || {}).length}\n\n`;
        content += `{yellow}Settings editor coming soon!{/yellow}\n`;
        this.updateContent(content);
    }
    /**
     * Render vault screen
     */
    renderVault() {
        this.currentScreen = "vault";
        let content = `{bold}{cyan} Vault - Encrypted Secrets{/cyan}{/bold}\n\n`;
        content += `Secure storage for API keys and secrets.\n\n`;
        content += `{white}${STATUS_MESSAGES.PRESS_ANY_KEY}{/white}\n`;
        this.updateContent(content);
        // Multi-step input: key -> value -> password
        this.promptVaultInput();
    }
    /**
     * Multi-step vault input
     */
    promptVaultInput() {
        sleep(TIMING.INPUT_DELAY_MS).then(() => {
            this.inputMode = "vault_add";
            setInputBoxVisible(this.inputBox, true);
            setInputPlaceholder(this.inputField, "Secret name (e.g. openrouter):");
            focusInput(this.inputField);
            readInput(this.inputField, (err, keyName) => {
                if (err || !keyName?.trim()) {
                    this.finishInput();
                    return;
                }
                // Step 2: get value
                clearInput(this.inputField);
                setInputPlaceholder(this.inputField, "Secret value:");
                readInput(this.inputField, (err2, secretValue) => {
                    if (err2 || !secretValue?.trim()) {
                        this.finishInput();
                        return;
                    }
                    // Step 3: get password
                    clearInput(this.inputField);
                    setInputPlaceholder(this.inputField, "Master password:");
                    readInput(this.inputField, (err3, password) => {
                        if (err3 || !password?.trim()) {
                            this.finishInput();
                            return;
                        }
                        // Encrypt and store
                        const encrypted = encrypt(secretValue.trim(), password.trim());
                        const addResult = safeSync(() => this.store.addBlock("vault", {
                            type: "vault",
                            content: keyName.trim(),
                            tags: ["secret", keyName.trim()],
                            encrypted,
                            iv: encrypted.substring(0, 24),
                            key_id: keyName.trim(),
                        }), "Failed to store secret");
                        if (addResult.success) {
                            this.updateContent(formatSuccess(`Secret "${keyName.trim()}" added successfully!`) + "\n\n" + STATUS_MESSAGES.PRESS_ANY_KEY);
                        }
                        else {
                            this.updateContent(formatError(addResult.error || "Failed to store secret") + "\n\n" + STATUS_MESSAGES.PRESS_ANY_KEY);
                        }
                        this.finishInput();
                        renderScreen(this.screen);
                    });
                });
            });
        });
    }
    /**
     * Render OpenClaw screen
     */
    renderOpenClaw() {
        this.currentScreen = "openclaw";
        const agents = this.openclawBridge.getAgents();
        const messages = this.openclawBridge.getMessages();
        let content = `{bold}{cyan} 🦞 OpenClaw - Agent Collaboration{/cyan}{/bold}\n\n`;
        content += `{white}Bridge Status:{/white}\n`;
        content += `  Connected Agents: ${agents.length}\n`;
        content += `  Messages Exchanged: ${messages.length}\n\n`;
        content += `{bold}Connected Agents:{/bold}\n`;
        if (agents.length === 0) {
            content += `  {yellow}No agents connected.{/yellow}\n`;
        }
        else {
            agents.forEach(agent => {
                content += `  {cyan}• ${agent.name}{/cyan}\n`;
                content += `    Status: ${agent.status}\n`;
                content += `    Compute Share: ${agent.computeShare}%\n`;
                content += `    Capabilities: ${agent.capabilities.join(", ")}\n`;
                content += `    DID: ${agent.did.substring(0, LIMITS.HASH_PREVIEW_LENGTH)}...\n\n`;
            });
        }
        if (messages.length > 0) {
            content += `{bold}Recent Messages:{/bold}\n`;
            messages.slice(-3).forEach(msg => {
                content += `  ${msg.from} → ${msg.to}: ${truncateContent(msg.content, LIMITS.CONTENT_PREVIEW_MEDIUM)}...\n`;
            });
        }
        content += `\n{white}Press Enter=message, 'n'=negotiate, 'r'=read logs{/white}\n`;
        this.updateContent(content);
        this.handleOpenClawInput();
    }
    /**
     * Handle OpenClaw input
     */
    handleOpenClawInput() {
        sleep(TIMING.INPUT_DELAY_MS).then(() => {
            this.inputMode = "openclaw_menu";
            setInputBoxVisible(this.inputBox, true);
            setInputPlaceholder(this.inputField, "Message, 'n'=negotiate, 'r'=logs:");
            focusInput(this.inputField);
            readInput(this.inputField, async (err, value) => {
                if (err || !value?.trim()) {
                    this.finishInput();
                    return;
                }
                const input = value.trim().toLowerCase();
                if (input === 'n') {
                    await this.handleComputeNegotiation();
                }
                else if (input === 'r') {
                    this.renderJournalLogs();
                }
                else {
                    await this.handleOpenClawMessage(value.trim());
                }
                this.finishInput();
                renderScreen(this.screen);
            });
        });
    }
    /**
     * Handle compute share negotiation
     */
    async handleComputeNegotiation() {
        clearInput(this.inputField);
        setInputPlaceholder(this.inputField, "Enter compute share % (e.g. 40):");
        readInput(this.inputField, (err, shareValue) => {
            if (err || !shareValue?.trim()) {
                this.finishInput();
                return;
            }
            const share = parseInt(shareValue.trim(), 10);
            if (isNaN(share)) {
                this.updateContent(formatError("Invalid number") + "\n\n" + STATUS_MESSAGES.PRESS_ANY_KEY);
                return;
            }
            const success = this.openclawBridge.negotiateComputeShare("openclaw-001", share);
            const updatedAgents = this.openclawBridge.getAgents();
            const agent = updatedAgents.find(a => a.id === "openclaw-001");
            if (success && agent) {
                this.updateContent(formatSuccess("Compute share negotiated!") + `\n\nNew share: ${agent.computeShare}%\n\n` + STATUS_MESSAGES.PRESS_ANY_KEY);
            }
            else {
                this.updateContent(formatError("Negotiation failed") + "\n\n" + STATUS_MESSAGES.PRESS_ANY_KEY);
            }
        });
    }
    /**
     * Handle sending message to OpenClaw
     */
    async handleOpenClawMessage(message) {
        const result = await safeAsync(() => this.openclawBridge.sendMessage("openclaw-001", message), "Failed to send message");
        if (result.success && result.data) {
            this.updateContent(`{bold}Sent: "${message}"{/bold}\n\n{cyan}Agent Response:{/cyan}\n\n${result.data.content}\n\n{white}${STATUS_MESSAGES.PRESS_ANY_KEY}{/white}`);
        }
        else {
            this.updateContent(formatError(result.error || "Failed to send message") + "\n\n" + STATUS_MESSAGES.PRESS_ANY_KEY);
        }
    }
    /**
     * Render journal logs
     */
    renderJournalLogs() {
        const logs = this.store.readChain("journal");
        const recentLogs = logs.slice(-LIMITS.MAX_LOG_ENTRIES).reverse();
        let logContent = `{bold}{cyan}📜 Journal Logs (ostatnie ${LIMITS.MAX_LOG_ENTRIES}){/cyan}{/bold}\n\n`;
        if (recentLogs.length === 0) {
            logContent += `{yellow}Brak wpisów w dzienniku.{/yellow}\n`;
        }
        else {
            recentLogs.forEach((block, index) => {
                logContent += `{cyan}[${block.index}]{/cyan} ${block.timestamp}\n`;
                logContent += `   ${truncateContent(block.data?.content, LIMITS.CONTENT_PREVIEW_LONG)}...\n\n`;
            });
        }
        logContent += `\n{white}${STATUS_MESSAGES.PRESS_ANY_KEY}{/white}`;
        this.updateContent(logContent);
    }
    /**
     * Render Cline screen
     */
    renderCline() {
        this.currentScreen = "cline";
        let content = `{bold}{cyan} 🤖 Cline - AI Coding Assistant{/cyan}{/bold}\n\n`;
        content += `{white}Cline is an AI coding assistant integrated with Memphis.{/white}\n\n`;
        const logs = this.store.readChain("journal");
        const clineLogs = logs.filter((b) => b.data?.content?.includes("[cline]")).slice(-10).reverse();
        content += `{bold}Recent Cline Activity:{/bold}\n`;
        if (clineLogs.length === 0) {
            content += `  {yellow}No Cline activity yet.{/yellow}\n`;
        }
        else {
            clineLogs.forEach((block) => {
                content += `  {cyan}•{/cyan} ${truncateContent(block.data?.content, LIMITS.CONTENT_PREVIEW_MEDIUM)}...\n`;
            });
        }
        content += `\n{bold}Available Commands:{/bold}\n`;
        content += `  {cyan}cline --help{/cyan}     - Show Cline help\n`;
        content += `  {cyan}cline <prompt>{/cyan}   - Run Cline task\n\n`;
        content += `{white}${STATUS_MESSAGES.PRESS_ANY_KEY}{/white}\n`;
        this.updateContent(content);
    }
    /**
     * Render offline screen
     */
    renderOffline() {
        this.currentScreen = "offline";
        const chains = this.store.listChains();
        const journalBlocks = this.store.getChainStats("journal");
        const vaultBlocks = this.store.getChainStats("vault");
        let content = `{bold}{cyan} 📡 Memphis Offline Control Panel{/cyan}{/bold}\n\n`;
        content += `{bold}{yellow}╔══════════════════════════════════════╗{/yellow}\n`;
        content += `{bold}{yellow}║     🟢 OFFLINE MODE ACTIVE         ║{/bold}{yellow}\n`;
        content += `{bold}{yellow}╚══════════════════════════════════════╝{/yellow}\n\n`;
        content += `{bold}🤖 LLM Configuration:{/bold}\n`;
        content += `   Model: {cyan}${DEFAULT_MODELS.PRIMARY}{/cyan} (primary)\n`;
        content += `   Fallback: {gray}${DEFAULT_MODELS.FALLBACK.join(" → ")}{/gray}\n\n`;
        content += `{bold}📊 System Stats:{/bold}\n`;
        content += `   Journal: {green}${journalBlocks.blocks} blocks{/green}\n`;
        content += `   Vault: {green}${vaultBlocks.blocks} secrets{/green}\n`;
        content += `   Memory: ${chains.length} chains\n\n`;
        content += `{bold}⚡ Quick Actions:{/bold}\n`;
        content += `   [1] Ask Memphis    - Query the AI brain\n`;
        content += `   [2] Add Journal    - Record a thought\n`;
        content += `   [3] Search         - Find in memory\n`;
        content += `   [4] Agents         - View connected agents\n\n`;
        content += `{bold}🌐 Network Status:{/bold}\n`;
        content += `   {green}●{/green} Local: Connected (Ollama running)\n`;
        content += `   {red}○{/red} Cloud: Disconnected\n\n`;
        content += `{white}Press 'm' to switch model{/white}\n`;
        this.updateContent(content);
        this.handleOfflineInput();
    }
    /**
     * Handle offline input
     */
    handleOfflineInput() {
        sleep(TIMING.INPUT_DELAY_MS).then(() => {
            this.inputMode = "offline_menu";
            setInputBoxVisible(this.inputBox, true);
            setInputPlaceholder(this.inputField, "Press number or 'm' for model:");
            focusInput(this.inputField);
            readInput(this.inputField, (err, value) => {
                if (err || !value?.trim()) {
                    this.finishInput();
                    return;
                }
                const input = value.trim().toLowerCase();
                if (input === 'm') {
                    this.handleModelSwitch();
                }
                else if (input === '1') {
                    this.navigateToMenu(MENU.ASK);
                }
                else if (input === '2') {
                    this.navigateToMenu(MENU.JOURNAL);
                }
                else if (input === '3') {
                    this.navigateToMenu(MENU.RECALL);
                }
                else if (input === '4') {
                    this.navigateToMenu(MENU.OPENCLAW);
                }
                else {
                    this.updateContent(formatWarning(`Unknown command: ${input}`) + "\n\n" + STATUS_MESSAGES.PRESS_ANY_KEY);
                }
                this.finishInput();
                renderScreen(this.screen);
            });
        });
    }
    /**
     * Handle model switch
     */
    handleModelSwitch() {
        clearInput(this.inputField);
        setInputPlaceholder(this.inputField, `Enter model name (${DEFAULT_MODELS.PRIMARY}, ${DEFAULT_MODELS.FALLBACK.join(", ")}):`);
        readInput(this.inputField, (err, modelValue) => {
            if (err || !modelValue?.trim()) {
                this.finishInput();
                return;
            }
            const validModels = [DEFAULT_MODELS.PRIMARY, ...DEFAULT_MODELS.FALLBACK];
            if (!validModels.includes(modelValue.trim())) {
                this.updateContent(formatError("Invalid model name") + "\n\n" + STATUS_MESSAGES.PRESS_ANY_KEY);
                return;
            }
            process.env.OLLAMA_MODEL = modelValue.trim();
            this.updateContent(formatSuccess(`Model switched to: ${modelValue.trim()}`) + "\n\n" + STATUS_MESSAGES.PRESS_ANY_KEY);
        });
    }
    /**
     * Handle input error
     */
    handleInputError(error) {
        this.updateContent(formatError(error) + "\n\n" + STATUS_MESSAGES.PRESS_ANY_KEY);
        this.finishInput();
        renderScreen(this.screen);
    }
    /**
     * Finish input mode
     */
    finishInput() {
        this.inputMode = "";
        setInputBoxVisible(this.inputBox, false);
    }
    /**
     * Run the TUI
     */
    run() {
        renderScreen(this.screen);
    }
}
// Run the TUI
const tui = new MemphisTUI();
tui.run();
//# sourceMappingURL=index.js.map