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
/**
 * Memphis TUI - Main Class
 * Refactored version with better organization and error handling
 */
export declare class MemphisTUI {
    private store;
    private config;
    private openclawBridge;
    private llmProvider;
    private llmProviderName;
    private currentScreen;
    private inputMode;
    private screen;
    private headerBox;
    private sidebarBox;
    private contentBox;
    private inputBox;
    private inputField;
    private statusBar;
    constructor();
    /**
     * Initialize LLM provider with fallback
     */
    private initLLM;
    /**
     * Setup keyboard bindings
     */
    private setupKeyBindings;
    /**
     * Handle character key presses
     */
    private handleCharKey;
    /**
     * Handle arrow key navigation
     */
    private handleNavigation;
    /**
     * Handle enter key
     */
    private handleEnter;
    /**
     * Get current menu index
     */
    private getCurrentMenuIndex;
    /**
     * Get sidebar content
     */
    private getSidebarContent;
    /**
     * Navigate to menu by number
     */
    private navigateToMenu;
    /**
     * Update content and sidebar
     */
    private updateContent;
    /**
     * Render dashboard
     */
    private renderDashboard;
    /**
     * Render journal screen
     */
    private renderJournal;
    /**
     * Render recall/search screen
     */
    private renderRecall;
    /**
     * Render ask screen
     */
    private renderAsk;
    /**
     * Ask LLM with memory context
     */
    private askLLM;
    /**
     * Render settings screen
     */
    private renderSettings;
    /**
     * Render vault screen
     */
    private renderVault;
    /**
     * Multi-step vault input
     */
    private promptVaultInput;
    /**
     * Render OpenClaw screen
     */
    private renderOpenClaw;
    /**
     * Handle OpenClaw input
     */
    private handleOpenClawInput;
    /**
     * Handle compute share negotiation
     */
    private handleComputeNegotiation;
    /**
     * Handle sending message to OpenClaw
     */
    private handleOpenClawMessage;
    /**
     * Render journal logs
     */
    private renderJournalLogs;
    /**
     * Render Cline screen
     */
    private renderCline;
    /**
     * Render offline screen
     */
    private renderOffline;
    /**
     * Handle offline input
     */
    private handleOfflineInput;
    /**
     * Handle model switch
     */
    private handleModelSwitch;
    /**
     * Handle input error
     */
    private handleInputError;
    /**
     * Finish input mode
     */
    private finishInput;
    /**
     * Run the TUI
     */
    run(): void;
}
