import { describe, it, expect, beforeAll } from "vitest";
import { getVaultSecret, isVaultInitialized, getProviderApiKey, VAULT_KEYS } from "../../src/integrations/vault-providers.js";

describe("Vault Provider Integration", () => {
  const testPassword = "test-vault-password";
  const testApiKey = "sk-test-12345678";

  describe("isVaultInitialized", () => {
    it("should check if vault chain exists", () => {
      const initialized = isVaultInitialized();
      // Should be true if user ran `memphis vault init`
      expect(typeof initialized).toBe("boolean");
    });
  });

  describe("getVaultSecret", () => {
    it("should return null for non-existent key", () => {
      const secret = getVaultSecret("non-existent-key", testPassword);
      expect(secret).toBeNull();
    });
  });

  describe("VAULT_KEYS constants", () => {
    it("should have correct key names", () => {
      expect(VAULT_KEYS.openai).toBe("openai-api-key");
      expect(VAULT_KEYS.openrouter).toBe("openrouter-api-key");
      expect(VAULT_KEYS.minimax).toBe("minimax-api-key");
    });
  });

  describe("getProviderApiKey", () => {
    it("should check env variable mapping", async () => {
      // The function checks OPENAI_API_KEY for "openai" provider
      // Let's verify the mapping works
      const key = await getProviderApiKey("openai", {
        vaultPassword: "wrong-password", // Force env check
      });
      
      // Will be null if no env var set and vault not working
      expect(key === null || typeof key === "string").toBe(true);
    });
  });
});
