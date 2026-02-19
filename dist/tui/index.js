#!/usr/bin/env node
/**
 * Memphis TUI – Entry Point
 *
 * Eksportuje MemphisTUI do użycia przez CLI (src/cli/index.ts).
 * Gdy uruchomiony bezpośrednio (memphis-tui), tworzy i uruchamia TUI.
 */
export { MemphisTUI } from "./app.js";
// Uruchamiamy TUI tylko gdy ten plik jest wykonywany bezpośrednio
// (nie gdy importowany przez CLI)
const isMain = process.argv[1]?.endsWith("tui/index.js") ||
    process.argv[1]?.endsWith("tui/index.ts");
if (isMain) {
    const { MemphisTUI } = await import("./app.js");
    const tui = new MemphisTUI();
    tui.run();
}
//# sourceMappingURL=index.js.map