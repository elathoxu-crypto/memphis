import { describe, it, expect } from "vitest";
import { encrypt, decrypt, generateDID, isBase64 } from "../../src/utils/crypto.js";

describe("crypto", () => {
  const password = "test-password-123";

  it("should generate a valid DID", () => {
    const did = generateDID();
    expect(did).toMatch(/^did:memphis:[a-f0-9]{32}$/);
  });

  it("should encrypt and decrypt correctly", () => {
    const plaintext = "sk-test-api-key-12345";
    const encrypted = encrypt(plaintext, password);
    
    expect(encrypted).toBeDefined();
    expect(encrypted.length).toBeGreaterThan(0);
    expect(isBase64(encrypted)).toBe(true);
    
    const decrypted = decrypt(encrypted, password);
    expect(decrypted).toBe(plaintext);
  });

  it("should fail with wrong password", () => {
    const plaintext = "secret-data";
    const encrypted = encrypt(plaintext, password);
    
    expect(() => decrypt(encrypted, "wrong-password")).toThrow();
  });

  it("should verify base64 correctly", () => {
    expect(isBase64("SGVsbG8gV29ybGQ=")).toBe(true);
    expect(isBase64("not-base64!")).toBe(false);
  });

  it("should produce different ciphertext each time (random IV)", () => {
    const plaintext = "same-data";
    const encrypted1 = encrypt(plaintext, password);
    const encrypted2 = encrypt(plaintext, password);
    
    // Same plaintext, different ciphertext due to random IV
    expect(encrypted1).not.toBe(encrypted2);
    
    // But both decrypt to same plaintext
    expect(decrypt(encrypted1, password)).toBe(plaintext);
    expect(decrypt(encrypted2, password)).toBe(plaintext);
  });
});
