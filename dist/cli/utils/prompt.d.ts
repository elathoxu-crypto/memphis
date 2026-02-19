/**
 * Prompt for sensitive input (e.g., passwords) without echoing characters.
 * Works in TTY terminals. For non-interactive use, prefer --password-stdin or --password-env.
 */
export declare function promptHidden(prompt: string): Promise<string>;
/** Read entire stdin (trim end) for non-interactive secrets. */
export declare function readStdinTrimmed(): Promise<string>;
