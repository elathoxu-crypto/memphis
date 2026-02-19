/**
 * Memphis TUI – Helpers
 * Pure utility functions, easily unit-testable without any blessed dependency.
 */
/** Truncate a string to maxLen, appending ellipsis when needed */
export function truncate(str, maxLen) {
    if (!str)
        return "";
    if (str.length <= maxLen)
        return str;
    return str.slice(0, maxLen - 3) + "...";
}
/** Format an ISO timestamp to a human-readable short form */
export function formatDate(iso) {
    if (!iso)
        return "N/A";
    try {
        const d = new Date(iso);
        if (isNaN(d.getTime()))
            return "Invalid date";
        return d.toLocaleString("pl-PL", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
        });
    }
    catch {
        return iso;
    }
}
/** Validate that a non-empty, non-whitespace string was provided */
export function validateInput(value) {
    return typeof value === "string" && value.trim().length > 0;
}
/**
 * Wrap an async function so it never throws.
 * Returns [result, null] on success or [null, Error] on failure.
 */
export async function safeAsync(fn) {
    try {
        const result = await fn();
        return [result, null];
    }
    catch (err) {
        return [null, err instanceof Error ? err : new Error(String(err))];
    }
}
/**
 * Wrap a synchronous function so it never throws.
 * Returns [result, null] on success or [null, Error] on failure.
 */
export function safeSync(fn) {
    try {
        const result = fn();
        return [result, null];
    }
    catch (err) {
        return [null, err instanceof Error ? err : new Error(String(err))];
    }
}
/** Build a unicode box around content (for dashboard-style widgets) */
export function buildBox(title, lines, width = 60) {
    const inner = width - 4; // 2 borders + 2 spaces
    const border = "─".repeat(width - 2);
    const paddedTitle = truncate(title, inner).padEnd(inner);
    const paddedLines = lines.map(l => `║ ${truncate(l, inner).padEnd(inner)} ║`);
    return [
        `╔${border}╗`,
        `║ ${paddedTitle} ║`,
        `╠${border}╣`,
        ...paddedLines,
        `╚${border}╝`,
    ].join("\n");
}
//# sourceMappingURL=helpers.js.map