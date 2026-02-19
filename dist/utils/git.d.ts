import type { Block } from "../memory/chain.js";
export interface GitCommitResult {
    success: boolean;
    sha?: string;
    message?: string;
    skipped?: boolean;
    error?: string;
}
/**
 * Sprawdza czy git jest dostępny w PATH
 */
export declare function isGitAvailable(): boolean;
/**
 * Inicjalizuje repo git w katalogu basePath jeśli jeszcze nie ma.
 * Ustawia podstawową konfigurację (user.name, user.email) jeśli brak.
 */
export declare function ensureGitRepo(basePath: string): boolean;
/**
 * Główna funkcja – commituje nowo dodany blok.
 * Wywołuj po każdym Store.addBlock().
 */
export declare function commitBlock(basePath: string, block: Block, options?: {
    push?: boolean;
    remote?: string;
}): GitCommitResult;
/**
 * Zwraca ostatnie N commitów jako czytelne stringi
 */
export declare function getRecentCommits(basePath: string, n?: number): string[];
/**
 * Czy repo ma uncommitted changes?
 */
export declare function hasUncommittedChanges(basePath: string): boolean;
