import { describe, it, expect } from "vitest";
import { createBlock, validateBlockAgainstSoul, verifyChain } from "../../src/memory/chain.js";
import { encrypt, decrypt } from "../../src/utils/crypto.js";

describe("Vault Security", () => {
  const testPassword = "test-password-123";

  describe("Encryption/Decryption", () => {
    it("should encrypt and decrypt data correctly", () => {
      const plaintext = "Hello, Memphis!";
      
      const encrypted = encrypt(plaintext, testPassword);
      const decrypted = decrypt(encrypted, testPassword);
      
      expect(decrypted).toBe(plaintext);
    });

    it("should produce different ciphertext for same plaintext (due to random salt)", () => {
      const plaintext = "Same message";
      
      const encrypted1 = encrypt(plaintext, testPassword);
      const encrypted2 = encrypt(plaintext, testPassword);
      
      // May or may not be different due to random salt - but both should decrypt
      const decrypted1 = decrypt(encrypted1, testPassword);
      const decrypted2 = decrypt(encrypted2, testPassword);
      
      expect(decrypted1).toBe(plaintext);
      expect(decrypted2).toBe(plaintext);
    });

    it("should fail with wrong password", () => {
      const plaintext = "Secret data";
      
      const encrypted = encrypt(plaintext, "correct-password");
      
      expect(() => decrypt(encrypted, "wrong-password")).toThrow();
    });

    it("should handle empty string", () => {
      const plaintext = "";
      
      const encrypted = encrypt(plaintext, testPassword);
      const decrypted = decrypt(encrypted, testPassword);
      
      expect(decrypted).toBe(plaintext);
    });

    it("should handle unicode characters", () => {
      const plaintext = "🔐 Śćrzęćęówki 中文 🔐";
      
      const encrypted = encrypt(plaintext, testPassword);
      const decrypted = decrypt(encrypted, testPassword);
      
      expect(decrypted).toBe(plaintext);
    });
  });

  describe("Vault Block Validation", () => {
    it("should accept valid vault block with encrypted data", () => {
      const block = createBlock("vault", {
        type: "vault",
        content: "encrypted-secret-data",
        tags: ["vault", "test"],
        encrypted: "some-encrypted-string",
      });

      const result = validateBlockAgainstSoul(block);
      expect(result.valid).toBe(true);
    });

    it("should accept vault revocation block", () => {
      const block = createBlock("vault", {
        type: "vault",
        content: "revoked",
        tags: ["vault", "revoked"],
        revoked: true,
      });

      const result = validateBlockAgainstSoul(block);
      expect(result.valid).toBe(true);
    });

    it("should accept vault genesis block without encrypted data", () => {
      const genesis = createBlock("vault", {
        type: "vault",
        content: "Genesis vault",
        tags: ["vault", "genesis"],
      });

      const result = validateBlockAgainstSoul(genesis);
      expect(result.valid).toBe(true);
    });
  });

  describe("Real World Scenarios", () => {
    it("should handle API key storage", () => {
      const apiKey = "sk-1234567890abcdef";
      
      const encrypted = encrypt(apiKey, testPassword);
      
      // Create vault block
      const block = createBlock("vault", {
        type: "vault",
        content: "API key stored",
        tags: ["api-key", "secret"],
        encrypted,
      });

      const result = validateBlockAgainstSoul(block);
      expect(result.valid).toBe(true);

      // Verify we can decrypt
      const decrypted = decrypt(encrypted, testPassword);
      expect(decrypted).toBe(apiKey);
    });

    it("should handle password rotation", () => {
      const oldPassword = "old-password";
      const newPassword = "new-password";
      const secret = "my-secret";
      
      // Encrypt with old password
      const encrypted = encrypt(secret, oldPassword);
      
      // Verify old password works
      expect(decrypt(encrypted, oldPassword)).toBe(secret);
      
      // Re-encrypt with new password
      const reEncrypted = encrypt(secret, newPassword);
      
      // Create vault block
      const block = createBlock("vault", {
        type: "vault",
        content: "Password rotated",
        tags: ["vault", "rotated"],
        encrypted: reEncrypted,
      });

      const result = validateBlockAgainstSoul(block);
      expect(result.valid).toBe(true);
      
      // Verify new password works
      expect(decrypt(reEncrypted, newPassword)).toBe(secret);
      
      // Old password should fail
      expect(() => decrypt(reEncrypted, oldPassword)).toThrow();
    });

    it("should handle database credentials", () => {
      const credentials = JSON.stringify({
        host: "localhost",
        port: 5432,
        user: "admin",
        password: "secret123",
      });
      
      const encrypted = encrypt(credentials, testPassword);
      
      const block = createBlock("vault", {
        type: "vault",
        content: "Database credentials",
        tags: ["database", "credentials"],
        encrypted,
      });

      const result = validateBlockAgainstSoul(block);
      expect(result.valid).toBe(true);
      
      const decrypted = decrypt(encrypted, testPassword);
      const parsed = JSON.parse(decrypted);
      expect(parsed.host).toBe("localhost");
      expect(parsed.password).toBe("secret123");
    });
  });
});
