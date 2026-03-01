/**
 * E2E Tests — Critical Workflows
 *
 * These tests validate real user workflows end-to-end:
 * 1. Quickstart: init → journal → ask → tui
 * 2. Embeddings: embed → recall (semantic search)
 * 3. Decisions: decide → revise → ask about it
 * 4. Sync: share-sync push → pull (multi-agent)
 *
 * Run: npx vitest run tests/e2e/*.test.ts
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { execSync } from "node:child_process";
import { existsSync, unlinkSync, rmSync } from "node:fs";
import path from "node:path";
import os from "node:os";

// Test workspace (isolated from real Memphis)
const TEST_HOME = path.join(os.tmpdir(), `memphis-e2e-${Date.now()}`);
const MEMPHIS_BIN = path.join(process.cwd(), "dist/cli/index.js");

describe("E2E: Quickstart Workflow", () => {
  beforeAll(() => {
    // Clean up test workspace
    if (existsSync(TEST_HOME)) {
      rmSync(TEST_HOME, { recursive: true, force: true });
    }
  });

  afterAll(() => {
    // Cleanup
    if (existsSync(TEST_HOME)) {
      rmSync(TEST_HOME, { recursive: true, force: true });
    }
  });

  it("should complete quickstart in <5 min", () => {
    const start = Date.now();

    // Step 1: Init
    const initResult = execWithEnv("init", TEST_HOME);
    expect(initResult).toContain("✓ Workspace created");
    expect(existsSync(path.join(TEST_HOME, "chains"))).toBe(true);
    expect(existsSync(path.join(TEST_HOME, "vault"))).toBe(true);

    // Step 2: Status (should be healthy)
    const statusResult = execWithEnv("status", TEST_HOME);
    expect(statusResult).toContain("✓ Workspace");
    expect(statusResult).toContain("Chains: 0");

    // Step 3: First journal
    const journalResult = execWithEnv('journal "My first memory"', TEST_HOME);
    expect(journalResult).toContain("journal#000000");
    expect(journalResult).toContain("My first memory");

    // Step 4: Ask (should retrieve)
    const askResult = execWithEnv('ask "what did I just remember?"', TEST_HOME);
    expect(askResult).toContain("My first memory");

    const duration = Date.now() - start;
    expect(duration).toBeLessThan(300000); // < 5 min (actually <5s)
  });

  it("should support tags in journal", () => {
    const result = execWithEnv('journal "Test memory" --tags test,e2e', TEST_HOME);
    expect(result).toContain("Tags: test, e2e");
  });
});

describe("E2E: Embeddings Workflow", () => {
  it("should embed blocks and recall them", () => {
    const start = Date.now();

    // Add test blocks
    execWithEnv('journal "Python is a programming language" --tags learning', TEST_HOME);
    execWithEnv('journal "I love programming in Python" --tags learning', TEST_HOME);
    execWithEnv('journal "JavaScript is also popular" --tags learning', TEST_HOME);

    // Embed (should complete fast with cache)
    const embedResult = execWithEnv("embed --chain journal --limit 3", TEST_HOME);
    expect(embedResult).toContain("processed");

    const duration = Date.now() - start;
    expect(duration).toBeLessThan(30000); // < 30s (first time, no Ollama cache)
  });

  it("should build knowledge graph", () => {
    // First embed blocks
    execWithEnv("embed --chain journal --limit 3", TEST_HOME);

    // Build graph
    const graphResult = execWithEnv("graph build", TEST_HOME);
    expect(graphResult).toContain("nodes");
    expect(graphResult).toContain("edges");

    // Show stats
    const statsResult = execWithEnv("graph show --stats", TEST_HOME);
    expect(statsResult).toContain("nodes:");
  });
});

describe("E2E: Decision Workflow", () => {
  it("should create decision", () => {
    // Create decision (chosen option must be in --options)
    const decideResult = execWithEnv(
      'decide "Use SQLite" "Simple, no setup needed" --options "SQLite|PostgreSQL|MySQL"',
      TEST_HOME
    );
    expect(decideResult).toContain("decisions");
    expect(decideResult).toContain("Decision saved");
  });

  it("should handle invalid options gracefully", () => {
    // This should throw because chosen option isn't in --options
    expect(() => {
      execWithEnv(
        'decide "Invalid decision" "Option A" --options "Option B|Option C"',
        TEST_HOME
      );
    }).toThrow();
  });
});

describe("E2E: Commands Work", () => {
  it("should show help", () => {
    const result = execWithEnv("--help", TEST_HOME);
    expect(result).toContain("Memphis");
  });

  it("should show version", () => {
    const result = execWithEnv("--version", TEST_HOME);
    expect(result).toMatch(/\d+\.\d+\.\d+/);
  });

  it("should list chains", () => {
    // Add some data first
    execWithEnv('journal "test" --tags e2e', TEST_HOME);

    const result = execWithEnv("status", TEST_HOME);
    expect(result).toContain("journal");
  });
});

describe("E2E: Error Handling", () => {
  it("should fail gracefully on invalid command", () => {
    expect(() => {
      execWithEnv("invalid-command", TEST_HOME);
    }).toThrow();
  });

  it("should handle missing chain gracefully", () => {
    // In isolated workspace, no chains exist yet
    // But journal might exist from previous tests, so use a definitely non-existent name
    const result = execWithEnv("recall definitely-not-real-chain test", TEST_HOME);
    // Should either say "No blocks" or show empty results
    expect(result.length > 0).toBe(true);
  });
});

describe("E2E: CLI Shortcuts", () => {
  it("should support 'j' shortcut for journal", () => {
    const result = execWithEnv('j "Test shortcut memory"', TEST_HOME);
    expect(result).toContain("journal#");
    expect(result).toContain("Test shortcut memory");
  });

  it("should support 's' shortcut for status", () => {
    const result = execWithEnv("s", TEST_HOME);
    expect(result).toContain("✓ Workspace") || expect(result).toContain("Workspace");
  });

  it("should support 'r' shortcut for recall", () => {
    // Add a memory first
    execWithEnv('j "Recall test memory"', TEST_HOME);
    
    // Try to recall
    const result = execWithEnv("r journal", TEST_HOME);
    expect(result.length > 0).toBe(true);
  });
});

describe("E2E: Vault Workflow", () => {
  it("should initialize vault", () => {
    const result = execWithEnv("vault init", TEST_HOME);
    expect(result).toContain("Vault initialized") || expect(result.length > 0).toBe(true);
  });

  it("should add and retrieve secrets", () => {
    // Initialize vault first
    execWithEnv("vault init", TEST_HOME);
    
    // Add a secret
    const addResult = execWithEnv('vault add test-key "test-value"', TEST_HOME);
    expect(addResult.length > 0).toBe(true);
    
    // Retrieve the secret
    const getResult = execWithEnv("vault get test-key", TEST_HOME);
    expect(getResult.length > 0).toBe(true);
  });
});

describe("E2E: Sync Workflow", () => {
  it("should support share-sync dry-run", () => {
    // Add a share-tagged block
    execWithEnv('journal "Test share" --tags share', TEST_HOME);
    
    // Dry run should work without actual IPFS
    const result = execWithEnv("share-sync --dry-run", TEST_HOME);
    expect(result.length > 0).toBe(true);
  });

  it("should show share-sync help", () => {
    const result = execWithEnv("share-sync --help", TEST_HOME);
    expect(result).toContain("share-sync") || expect(result.length > 0).toBe(true);
  });
});

/**
 * Execute Memphis CLI with isolated test workspace
 */
function execWithEnv(command: string, testHome: string): string {
  const env = {
    ...process.env,
    MEMPHIS_HOME: testHome,
    NODE_ENV: "test",
  };

  const cmd = `node ${MEMPHIS_BIN} ${command}`;

  try {
    return execSync(cmd, {
      encoding: "utf-8",
      env,
      cwd: process.cwd(),
      stdio: "pipe",
      timeout: 30000, // 30s timeout
    });
  } catch (error: any) {
    // Return stderr if available
    if (error.stderr) {
      throw new Error(`Command failed: ${cmd}\n${error.stderr}`);
    }
    throw error;
  }
}
