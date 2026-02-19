/**
 * Memphis TUI – Helpers
 * Pure utility functions, easily unit-testable without any blessed dependency.
 */
/** Truncate a string to maxLen, appending ellipsis when needed */
export declare function truncate(str: string, maxLen: number): string;
/** Format an ISO timestamp to a human-readable short form */
export declare function formatDate(iso: string | undefined): string;
/** Validate that a non-empty, non-whitespace string was provided */
export declare function validateInput(value: string | undefined | null): boolean;
/**
 * Wrap an async function so it never throws.
 * Returns [result, null] on success or [null, Error] on failure.
 */
export declare function safeAsync<T>(fn: () => Promise<T>): Promise<[T, null] | [null, Error]>;
/**
 * Wrap a synchronous function so it never throws.
 * Returns [result, null] on success or [null, Error] on failure.
 */
export declare function safeSync<T>(fn: () => T): [T, null] | [null, Error];
/** Build a unicode box around content (for dashboard-style widgets) */
export declare function buildBox(title: string, lines: string[], width?: number): string;
