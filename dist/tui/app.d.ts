/**
 * Memphis TUI – Main App (MemphisTUI class + widget type)
 * Bootstrap blessed, wires up keybindings, delegates rendering to screens/.
 */
import blessed from "blessed";
import { type ScreenName } from "./state.js";
export interface TUIWidgets {
    screen: blessed.Widgets.Screen;
    contentBox: blessed.Widgets.BoxElement;
    inputBox: blessed.Widgets.BoxElement;
    inputField: blessed.Widgets.TextboxElement;
    statusBar: blessed.Widgets.BoxElement;
}
export declare class MemphisTUI {
    private screen;
    private headerBox;
    private sidebarBox;
    private contentBox;
    private inputBox;
    private inputField;
    private statusBar;
    private store;
    private config;
    private openclawBridge;
    private llmProvider;
    private state;
    private get widgets();
    constructor();
    private initLLM;
    private bindKeys;
    private moveMenu;
    private buildSidebar;
    private refreshSidebar;
    navigateTo(name: ScreenName): void;
    run(): void;
}
