#!/usr/bin/env node
import blessed from "blessed";
import { Store } from "../memory/store.js";
import { loadConfig } from "../config/loader.js";
import { queryBlocks } from "../memory/query.js";
import { encrypt } from "../utils/crypto.js";
// Colors
const COLORS = {
    primary: "cyan",
    secondary: "magenta",
    success: "green",
    warning: "yellow",
    error: "red",
    text: "white",
    muted: "gray",
    bg: "black",
};
export class MemphisTUI {
    screen;
    store;
    config;
    currentScreen = "dashboard";
    inputMode = "";
    // UI Elements
    headerBox;
    sidebarBox;
    contentBox;
    inputBox;
    inputField;
    statusBar;
    constructor() {
        // Initialize store and config
        const config = loadConfig();
        this.config = config;
        this.store = new Store(config.memory?.path || `${process.env.HOME}/.memphis/chains`);
        // Create screen
        this.screen = blessed.screen({
            smartCSR: true,
            title: "Memphis - AI Brain",
            fullUnicode: true,
        });
        // Create header
        this.headerBox = blessed.box({
            top: 0,
            left: 0,
            width: "100%",
            height: 3,
            style: {
                fg: COLORS.text,
                bg: COLORS.primary,
                bold: true,
            },
            content: `{center}{bold} Memphis - Local-first AI Brain{/bold}{/center}`,
        });
        // Create sidebar
        this.sidebarBox = blessed.box({
            top: 3,
            left: 0,
            width: "25%",
            height: "90%",
            style: {
                fg: COLORS.text,
                bg: "black",
                border: { fg: COLORS.primary },
            },
            tags: true,
            content: this.getSidebarContent(),
        });
        // Create content area
        this.contentBox = blessed.box({
            top: 3,
            left: "25%",
            width: "75%",
            height: "90%",
            style: {
                fg: COLORS.text,
                bg: "black",
                border: { fg: COLORS.primary },
            },
            tags: true,
            scrollable: true,
            content: "",
        });
        // Create input area
        this.inputBox = blessed.box({
            bottom: 2,
            left: 0,
            width: "100%",
            height: 3,
            style: {
                fg: COLORS.text,
                bg: "black",
                border: { fg: COLORS.secondary },
            },
            visible: false,
        });
        this.inputField = blessed.textbox({
            parent: this.inputBox,
            top: 0,
            left: 1,
            width: "98%",
            height: 1,
            style: {
                fg: COLORS.text,
                bg: "black",
            },
            placeholder: "Type your input...",
        });
        // Create status bar
        this.statusBar = blessed.box({
            bottom: 0,
            left: 0,
            width: "100%",
            height: 1,
            style: {
                fg: COLORS.text,
                bg: COLORS.secondary,
            },
            content: "Press 'q' to quit | Arrow keys to navigate | Enter to select",
        });
        // Append all elements
        this.screen.append(this.headerBox);
        this.screen.append(this.sidebarBox);
        this.screen.append(this.contentBox);
        this.screen.append(this.inputBox);
        this.screen.append(this.statusBar);
        // Key bindings
        this.screen.key(["escape", "q", "C-c"], () => {
            process.exit(0);
        });
        this.screen.key(["up", "down"], (ch, key) => {
            this.handleNavigation(key.name);
        });
        this.screen.key(["enter"], () => {
            this.handleEnter();
        });
        this.screen.key(["1", "2", "3", "4", "5", "6"], (ch) => {
            this.navigateToMenu(parseInt(ch));
        });
        // Render initial screen
        this.renderDashboard();
        this.screen.render();
    }
    getSidebarContent() {
        const menuItems = [
            " Dashboard",
            " Journal",
            " Vault",
            " Recall",
            " Ask",
            " Settings",
        ];
        let content = "{bold}Navigation{/bold}\n\n";
        menuItems.forEach((item, index) => {
            const prefix = this.currentScreen === item.toLowerCase().slice(1)
                ? "> "
                : "  ";
            content += `${prefix}${item}\n`;
        });
        content += "\n\n{bold}Quick Stats{/bold}\n";
        const chains = this.store.listChains();
        content += `Chains: ${chains.length}\n`;
        chains.forEach((chain) => {
            const stats = this.store.getChainStats(chain);
            content += `  - ${chain}: ${stats.blocks} blocks\n`;
        });
        return content;
    }
    renderDashboard() {
        this.currentScreen = "dashboard";
        const chains = this.store.listChains();
        let content = `{bold}{cyan} Dashboard{/cyan}{/bold}\n\n`;
        content += `Welcome to Memphis! Your local-first AI brain.\n\n`;
        if (chains.length === 0) {
            content += `{yellow}No memory chains yet. Start by adding a journal entry!{/yellow}\n`;
        }
        else {
            content += `{bold}Memory Chains:{/bold}\n\n`;
            chains.forEach((chain) => {
                const stats = this.store.getChainStats(chain);
                content += `{cyan}> ${chain}{/cyan}\n`;
                content += `    Blocks: ${stats.blocks}\n`;
                content += `    First: ${stats.first || "N/A"}\n`;
                content += `    Last: ${stats.last || "N/A"}\n\n`;
            });
        }
        content += `\n{bold}Recent Activity:{/bold}\n`;
        chains.slice(0, 3).forEach((chain) => {
            const blocks = this.store.readChain(chain);
            if (blocks.length > 0) {
                const lastBlock = blocks[blocks.length - 1];
                content += `  * ${chain}: ${lastBlock.data?.content?.substring(0, 50)}...\n`;
            }
        });
        this.contentBox.setContent(content);
        this.sidebarBox.setContent(this.getSidebarContent());
    }
    handleNavigation(direction) {
        this.screen.render();
    }
    handleEnter() {
        // Handle enter based on input mode
    }
    navigateToMenu(num) {
        switch (num) {
            case 1:
                this.renderDashboard();
                break;
            case 2:
                this.renderJournal();
                break;
            case 3:
                this.renderVault();
                break;
            case 4:
                this.renderRecall();
                break;
            case 5:
                this.renderAsk();
                break;
            case 6:
                this.renderSettings();
                break;
        }
        this.screen.render();
    }
    renderJournal() {
        this.currentScreen = "journal";
        let content = `{bold}{cyan} Journal Entry{/cyan}{/bold}\n\n`;
        content += `Add a new entry to your memory.\n\n`;
        content += `{white}Press Enter to start typing your journal entry...{/white}\n`;
        this.contentBox.setContent(content);
        this.sidebarBox.setContent(this.getSidebarContent());
        // Show input after a brief delay
        setTimeout(() => {
            this.inputMode = "journal";
            this.inputBox.show();
            this.inputField.options.placeholder = "What's on your mind?";
            this.inputField.focus();
            this.inputField.readInput((err, value) => {
                if (value && value.trim()) {
                    this.store.addBlock("journal", {
                        type: "journal",
                        content: value.trim(),
                        tags: [],
                    });
                    this.contentBox.setContent(`{green} Entry added successfully!{/green}\n\nPress any key to return to dashboard...`);
                }
                this.inputMode = "";
                this.inputBox.hide();
                this.screen.render();
            });
        }, 100);
    }
    renderRecall() {
        this.currentScreen = "recall";
        let content = `{bold}{cyan} Recall - Search Memory{/cyan}{/bold}\n\n`;
        content += `Search through your memory chains.\n\n`;
        content += `{white}Press Enter to search...{/white}\n`;
        this.contentBox.setContent(content);
        this.sidebarBox.setContent(this.getSidebarContent());
        setTimeout(() => {
            this.inputMode = "recall";
            this.inputBox.show();
            this.inputField.options.placeholder = "Enter keyword to search...";
            this.inputField.focus();
            this.inputField.readInput((err, value) => {
                if (value && value.trim()) {
                    const results = queryBlocks(this.store, { keyword: value.trim() });
                    let resultContent = `{bold}Search Results for "${value.trim()}":{/bold}\n\n`;
                    if (results.length === 0) {
                        resultContent += `{yellow}No results found.{/yellow}\n`;
                    }
                    else {
                        results.forEach((block, index) => {
                            resultContent += `{cyan}${index + 1}. ${block.chain}{/cyan}\n`;
                            resultContent += `   ${block.data?.content?.substring(0, 100)}...\n`;
                            resultContent += `   ${block.timestamp}\n\n`;
                        });
                    }
                    resultContent += `\n{white}Press any key to continue...{/white}`;
                    this.contentBox.setContent(resultContent);
                }
                this.inputMode = "";
                this.inputBox.hide();
                this.screen.render();
            });
        }, 100);
    }
    renderAsk() {
        this.currentScreen = "ask";
        let content = `{bold}{cyan} Ask Memphis{/cyan}{/bold}\n\n`;
        content += `Ask a question about your memory.\n\n`;
        content += `{white}Press Enter to ask...{/white}\n`;
        this.contentBox.setContent(content);
        this.sidebarBox.setContent(this.getSidebarContent());
        setTimeout(() => {
            this.inputMode = "ask";
            this.inputBox.show();
            this.inputField.options.placeholder = "What would you like to know?";
            this.inputField.focus();
            this.inputField.readInput((err, value) => {
                if (value && value.trim()) {
                    const results = queryBlocks(this.store, { keyword: value.trim() });
                    let responseContent = `{bold}Question: "${value.trim()}"{/bold}\n\n`;
                    if (results.length === 0) {
                        responseContent += `{yellow}I don't have any relevant memories about that.{/yellow}\n`;
                        responseContent += `\n{yellow}Note: LLM integration coming soon!{/yellow}\n`;
                    }
                    else {
                        responseContent += `{green}Based on your memory:{/green}\n\n`;
                        results.slice(0, 3).forEach((block) => {
                            responseContent += `* ${block.data?.content}\n\n`;
                        });
                    }
                    responseContent += `\n{white}Press any key to continue...{/white}`;
                    this.contentBox.setContent(responseContent);
                }
                this.inputMode = "";
                this.inputBox.hide();
                this.screen.render();
            });
        }, 100);
    }
    renderSettings() {
        this.currentScreen = "settings";
        let content = `{bold}{cyan} Settings{/cyan}{/bold}\n\n`;
        content += `{white}Configuration:{/white}\n\n`;
        content += `Storage Path: ${this.config.memory?.path || "~/.memphis/chains"}\n`;
        content += `Providers: ${Object.keys(this.config.providers || {}).length}\n\n`;
        content += `{yellow}Settings editor coming soon!{/yellow}\n`;
        this.contentBox.setContent(content);
        this.sidebarBox.setContent(this.getSidebarContent());
    }
    renderVault() {
        this.currentScreen = "vault";
        let content = `{bold}{cyan} Vault - Encrypted Secrets{/cyan}{/bold}\n\n`;
        content += `Secure storage for API keys and secrets.\n\n`;
        content += `{white}Press Enter to add a new secret...{/white}\n`;
        this.contentBox.setContent(content);
        this.sidebarBox.setContent(this.getSidebarContent());
        setTimeout(() => {
            this.inputMode = "vault_add";
            this.inputBox.show();
            this.inputField.options.placeholder = "Secret name (e.g. openrouter):";
            this.inputField.focus();
            this.inputField.readInput((err, keyName) => {
                if (keyName && keyName.trim()) {
                    // Now ask for value
                    this.inputField.setValue("");
                    this.inputField.options.placeholder = "Secret value:";
                    this.inputField.readInput((err2, secretValue) => {
                        if (secretValue && secretValue.trim()) {
                            // Now ask for password
                            this.inputField.setValue("");
                            this.inputField.options.placeholder = "Master password:";
                            this.inputField.readInput((err3, password) => {
                                if (password && password.trim()) {
                                    const encrypted = encrypt(secretValue.trim(), password.trim());
                                    this.store.addBlock("vault", {
                                        type: "vault",
                                        content: keyName.trim(),
                                        tags: ["secret", keyName.trim()],
                                        encrypted,
                                        iv: encrypted.substring(0, 24),
                                        key_id: keyName.trim(),
                                    });
                                    this.contentBox.setContent(`{green} Secret "${keyName.trim()}" added successfully!{/green}\n\nPress any key to return...`);
                                }
                                this.inputMode = "";
                                this.inputBox.hide();
                                this.screen.render();
                            });
                        }
                        else {
                            this.inputMode = "";
                            this.inputBox.hide();
                            this.screen.render();
                        }
                    });
                }
                else {
                    this.inputMode = "";
                    this.inputBox.hide();
                    this.screen.render();
                }
            });
        }, 100);
    }
    run() {
        this.screen.render();
    }
}
// Run the TUI
const tui = new MemphisTUI();
tui.run();
//# sourceMappingURL=index.js.map