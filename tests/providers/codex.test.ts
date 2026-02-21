import { describe, it, expect } from "vitest";
import { CodexProvider } from "../../src/providers/codex.js";

describe("Codex Provider", () => {
  describe("isConfigured", () => {
    it("should check if codex CLI is available", () => {
      const provider = new CodexProvider();
      // Will be false if codex is not installed
      const configured = provider.isConfigured();
      expect(typeof configured).toBe("boolean");
    });
  });

  describe("getSecurityStatus", () => {
    it("should report security status", () => {
      const provider = new CodexProvider();
      const status = provider.getSecurityStatus();
      
      expect(status).toEqual({
        apiKeyInMemory: false,
        apiKeyInEnv: false,
        apiCallsFromMemphis: false,
        localExecution: true,
      });
    });

    it("should confirm API key never enters Memphis", () => {
      const provider = new CodexProvider();
      const status = provider.getSecurityStatus();
      
      // The key security feature - API key is never in Memphis's memory
      expect(status.apiKeyInMemory).toBe(false);
      expect(status.apiCallsFromMemphis).toBe(false);
    });
  });

  describe("Security Analysis", () => {
    it("should not store API key in provider", () => {
      const provider = new CodexProvider();
      
      // API key field is just a placeholder - no real key stored
      expect(provider.apiKey).toBe("codex-cli");
    });

    it("should use CLI-based execution", () => {
      const provider = new CodexProvider();
      
      // Local execution is a key security feature
      expect(provider.getSecurityStatus().localExecution).toBe(true);
    });

    it("should not make direct API calls", () => {
      const provider = new CodexProvider();
      
      // Memphis doesn't make API calls - Codex CLI does
      expect(provider.getSecurityStatus().apiCallsFromMemphis).toBe(false);
    });
  });

  describe("Provider Info", () => {
    it("should have correct name", () => {
      const provider = new CodexProvider();
      expect(provider.name).toBe("codex");
    });

    it("should list available models", () => {
      const provider = new CodexProvider();
      expect(provider.models).toContain("gpt-5.2-codex");
    });

    it("should have empty baseUrl (CLI-based)", () => {
      const provider = new CodexProvider();
      expect(provider.baseUrl).toBe("");
    });
  });
});
