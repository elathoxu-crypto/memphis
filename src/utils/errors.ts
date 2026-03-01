/**
 * User-Friendly Error Messages
 *
 * Improves error UX by:
 * - Using plain language (no jargon)
 * - Providing actionable suggestions
 * - Explaining what went wrong
 * - Hiding internal stack traces (use --debug for full)
 */

export class UserError extends Error {
  constructor(
    message: string,
    public readonly suggestion?: string,
    public readonly debugInfo?: string
  ) {
    super(message);
    this.name = "UserError";
  }

  toString(): string {
    let output = `\n❌ ${this.message}`;

    if (this.suggestion) {
      output += `\n\n💡 ${this.suggestion}`;
    }

    if (this.debugInfo) {
      output += `\n\n🔧 Debug: ${this.debugInfo}`;
    }

    return output + "\n";
  }
}

/**
 * Error factories for common scenarios
 */
export const Errors = {
  // Provider errors
  providerNotConfigured: (provider: string): UserError =>
    new UserError(
      `No ${provider} provider configured.`,
      `Run: memphis status --provider\nOr edit ~/.memphis/config.yaml to add provider configuration.`,
      "Check config.yaml or environment variables"
    ),

  providerNotAvailable: (provider: string, reason?: string): UserError =>
    new UserError(
      `${provider} provider is not available${reason ? ` (${reason})` : ""}.`,
      "Try a different provider or check your connection.",
      reason
    ),

  noProviderAvailable: (): UserError =>
    new UserError(
      "No LLM provider is available.",
      "Configure at least one provider in ~/.memphis/config.yaml (ollama, openai, minimax, openrouter).",
      "Check providers: memphis status"
    ),

  // Workspace errors
  workspaceNotInitialized: (): UserError =>
    new UserError(
      "Memphis workspace is not initialized.",
      "Run: memphis init\nThis will create ~/.memphis/ with default configuration.",
      "Missing ~/.memphis directory"
    ),

  workspaceCorrupted: (): UserError =>
    new UserError(
      "Memphis workspace appears corrupted.",
      "Try: memphis verify --chain all\nOr: rm -rf ~/.memphis && memphis init (CAUTION: deletes all data)",
      "Run memphis repair if possible"
    ),

  // Chain errors
  chainNotFound: (chain: string): UserError =>
    new UserError(
      `Chain '${chain}' not found.`,
      "Available chains:\n  - journal\n  - ask\n  - decisions\n  - summary\n  - share",
      `Check: memphis status`
    ),

  chainEmpty: (chain: string): UserError =>
    new UserError(
      `Chain '${chain}' is empty.`,
      "Add entries first: memphis journal <text> --tags x,y",
      "No blocks in chain"
    ),

  // Embeddings errors
  embeddingsNotReady: (): UserError =>
    new UserError(
      "No embeddings available for semantic search.",
      "Run: memphis embed --chain <chain>\nThen try again.",
      "Run memphis status to check embeddings"
    ),

  modelNotInstalled: (model: string): UserError =>
    new UserError(
      `Model '${model}' is not installed.`,
      "Run: ollama pull <model>\nOr install the model for your provider.",
      "Check available models with provider"
    ),

  // Decision errors
  invalidDecisionChoice: (chosen: string, options: string[]): UserError =>
    new UserError(
      `Invalid choice '${chosen}' - not in available options.`,
      `Available options: ${options.join(", ")}\nUse one of the available options.`,
      `Choose from: ${options.join(", ")}`
    ),

  // Network errors
  networkNotConfigured: (): UserError =>
    new UserError(
      "IPFS/Pinata not configured for share-sync.",
      "Add Pinata API keys to ~/.memphis/config.yaml or run: memphis share-sync --push-disabled",
      "Check: integrations.pinata in config.yaml"
    ),

  networkSyncFailed: (reason: string): UserError =>
    new UserError(
      `Network sync failed: ${reason}`,
      "Check your internet connection and Pinata configuration.",
      reason
    ),

  // Command errors
  invalidCommand: (command: string): UserError =>
    new UserError(
      `Unknown command: '${command}'`,
      "Run: memphis --help\nOr use: memphis tui (interactive)",
      `Available commands: run memphis --help`
    ),

  invalidArgument: (arg: string, expected?: string): UserError =>
    new UserError(
      `Invalid argument: '${arg}'`,
      expected || "Run: memphis <command> --help",
      `Expected: ${expected || "see --help"}`
    ),

  // File errors
  fileNotFound: (path: string): UserError =>
    new UserError(
      `File not found: ${path}`,
      "Check the file path and try again.",
      "Verify path exists"
    ),

  fileReadError: (path: string, reason: string): UserError =>
    new UserError(
      `Cannot read file: ${path}`,
      "Check file permissions and format.",
      reason
    ),

  // Generic errors
  generic: (message: string, suggestion?: string): UserError =>
    new UserError(message, suggestion),

  // Development/debug errors (shown only with --debug)
  internalError: (error: Error): UserError =>
    new UserError(
      "An internal error occurred.",
      "Run with --debug for details, or report this issue on GitHub.",
      `Error: ${error.message}`
    ),
};

/**
 * Wrap errors with user-friendly messages
 */
export function wrapError(error: unknown, context?: string): UserError {
  if (error instanceof UserError) {
    return error;
  }

  const message = error instanceof Error ? error.message : String(error);

  // Detect common error patterns and provide helpful suggestions
  if (message.includes("EACCES") || message.includes("permission")) {
    return new UserError(
      "Permission denied.",
      "Check file permissions or run with appropriate access rights.",
      message
    );
  }

  if (message.includes("ENOENT")) {
    return new UserError(
      "File or directory not found.",
      "Check the path and try again.",
      message
    );
  }

  if (message.includes("ECONNREFUSED") || message.includes("ENOTFOUND")) {
    return new UserError(
      "Network connection failed.",
      "Check your internet connection and try again.",
      message
    );
  }

  if (message.includes("401") || message.includes("403")) {
    return new UserError(
      "Authentication failed.",
      "Check your API keys and permissions.",
      message
    );
  }

  if (message.includes("404")) {
    return new UserError(
      "Resource not found.",
      "Check the URL or path and try again.",
      message
    );
  }

  // Generic error with context
  return Errors.internalError(error instanceof Error ? error : new Error(message));
}
