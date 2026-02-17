#!/usr/bin/env node
export declare class MemphisTUI {
    private screen;
    private store;
    private config;
    private openclawBridge;
    private currentScreen;
    private inputMode;
    private headerBox;
    private sidebarBox;
    private contentBox;
    private inputBox;
    private inputField;
    private statusBar;
    constructor();
    private handleNavigation;
    private handleEnter;
    private getCurrentMenuIndex;
    private getSidebarContent;
    private renderDashboard;
    private navigateToMenu;
    private renderJournal;
    private renderRecall;
    private renderAsk;
    private renderSettings;
    private renderVault;
    private renderOpenClaw;
    run(): void;
}
