/**
 * Codex Provider for Memphis
 *
 * Codex is a CLI tool that uses OpenAI's API under the hood.
 * It runs locally and doesn't make direct API calls from our code.
 *
 * SECURITY ANALYSIS:
 * - Codex CLI calls OpenAI API directly from the user's machine
 * - API key is stored in Codex's config (~/.codex/config.toml)
 * - No API calls go through Memphis - only CLI invocations
 * - This is MORE secure than direct API calls because:
 *   1. Key stays in user's local config
 *   2. Memphis never sees the key
 *   3. Codex handles all API communication locally
 */
import { BaseProvider } from "./base.js";
import type { LLMMessage, LLMResponse } from "./index.js";
export declare class CodexProvider extends BaseProvider {
    name: string;
    baseUrl: string;
    models: string[];
    apiKey: string;
    private codexPath;
    private workspace;
    constructor(options?: {
        codexPath?: string;
        workspace?: string;
    });
    isConfigured(): boolean;
    /**
     * Execute Codex CLI
     *
     * SECURITY: This spawns a local process. The API key is NEVER passed through Memphis.
     * - If using Codex's built-in API key: it reads from ~/.codex/config.toml
     * - If using OPENAI_API_KEY: it reads from environment
     * - Memphis only sees the CLI output, never the key
     */
    chat(messages: LLMMessage[], options?: {
        model?: string;
        temperature?: number;
        max_tokens?: number;
    }): Promise<LLMResponse>;
    /**
     * Run Codex CLI command
     *
     * SECURITY CONSIDERATIONS:
     * 1. We don't pass any API keys - Codex handles that internally
     * 2. We run in a sandboxed temp directory by default
     * 3. We limit what the agent can do with flags
     */
    private runCodex;
    /**
     * Check if Codex is properly configured with API key
     * This doesn't leak the key - just checks if config exists
     */
    checkApiKey(): Promise<boolean>;
    /**
     * Get security status - what is/isn't being leaked
     */
    getSecurityStatus(): {
        apiKeyInMemory: boolean;
        apiKeyInEnv: boolean;
        apiCallsFromMemphis: boolean;
        localExecution: boolean;
    };
}
/**
 * Security Analysis for Codex Integration
 *
 * ============================================================================
 * POTENTIAL LEAK VECTORS AND MITIGATIONS:
 * ============================================================================
 *
 * 1. API Key in Memory
 *    - MITIGATION: Memphis never receives or stores the API key
 *    - Codex reads directly from ~/.codex/config.toml
 *    - Result: ✅ SAFE
 *
 * 2. API Key in Environment Variables
 *    - MITIGATION: We explicitly filter env vars in execSync
 *    - We only pass PATH and HOME
 *    - Result: ✅ SAFE
 *
 * 3. API Key in Logs/Output
 *    - MITIGATION: We capture stdout, never log the key
 *    - Codex output is text only
 *    - Result: ✅ SAFE (but user should check Codex output)
 *
 * 4. Network Traffic
 *    - MITIGATION: All API calls are made BY Codex CLI, not Memphis
 *    - Memphis has no network calls to OpenAI
 *    - Result: ✅ SAFE
 *
 * 5. Filesystem Access
 *    - MITIGATION: Run in temp directory by default
 *    - User can specify workspace with --workspace flag
 *    - Result: ✅ SAFE (with default settings)
 *
 * 6. Command Injection
 *    - MITIGATION: Prompt is passed as argument, not shell-evaluated
 *    - Using execSync with array-safe string
 *    - Result: ✅ SAFE
 *
 * ============================================================================
 * COMPARISON WITH DIRECT API CALLS:
 * ============================================================================
 *
 * | Aspect              | Direct API    | Codex CLI     |
 * |---------------------|---------------|---------------|
 * | Key in Memphis      | YES           | NO            |
 * | Key in memory       | YES           | NO            |
 * | Network from app    | YES           | NO            |
 * | Sandbox control     | Limited       | Full (flags)  |
 * | Local execution     | NO            | YES           |
 *
 * CONCLUSION: Codex is MORE SECURE for Memphis because:
 * 1. The API key never enters Memphis's process
 * 2. All API communication stays on user's machine
 * 3. User has full control via Codex config
 * ============================================================================
 */
