import { describe, it, expect } from "vitest";
import { createBlock, validateBlockAgainstSoul } from "../../src/memory/chain.js";

describe("SSI Credentials Security", () => {
  describe("Credential Block Validation", () => {
    it("should accept valid credential block", () => {
      const block = createBlock("credential", {
        type: "credential",
        content: "Verified credential",
        tags: ["credential", "verified"],
        schema: "EmailCredential",
        issuer: "did:example:issuer123",
        holder: "did:example:holder456",
      });

      const result = validateBlockAgainstSoul(block);
      expect(result.valid).toBe(true);
    });

    it("should reject credential without schema", () => {
      const block = createBlock("credential", {
        type: "credential",
        content: "Invalid credential",
        tags: ["credential"],
        issuer: "did:example:issuer",
        holder: "did:example:holder",
        // Missing schema
      });

      const result = validateBlockAgainstSoul(block);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain("schema");
    });

    it("should reject credential without issuer", () => {
      const block = createBlock("credential", {
        type: "credential",
        content: "Invalid credential",
        tags: ["credential"],
        schema: "EmailCredential",
        holder: "did:example:holder",
        // Missing issuer
      });

      const result = validateBlockAgainstSoul(block);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain("issuer");
    });

    it("should reject credential without holder", () => {
      const block = createBlock("credential", {
        type: "credential",
        content: "Invalid credential",
        tags: ["credential"],
        schema: "EmailCredential",
        issuer: "did:example:issuer",
        // Missing holder
      });

      const result = validateBlockAgainstSoul(block);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain("holder");
    });
  });

  describe("DID Format Validation", () => {
    it("should accept standard DID format", () => {
      const block = createBlock("credential", {
        type: "credential",
        content: "DID test",
        tags: ["credential"],
        schema: "KYCCredential",
        issuer: "did:ethr:0x1234567890abcdef",
        holder: "did:web:example.com:user",
      });

      const result = validateBlockAgainstSoul(block);
      expect(result.valid).toBe(true);
    });

    it("should accept did:key format", () => {
      const block = createBlock("credential", {
        type: "credential",
        content: "did:key test",
        tags: ["credential"],
        schema: "VerifiableCredential",
        issuer: "did:key:z6MkpTHR8VNsBxYAAWHut2Geadd9jSwu88uVyp5F3EfXyLK",
        holder: "did:key:z6MkrPhFFVRYGFXGH7JzFvfqshvT6JWCYR4GaR4G6EQmkkRG",
      });

      const result = validateBlockAgainstSoul(block);
      expect(result.valid).toBe(true);
    });
  });

  describe("Credential Revocation", () => {
    it("should handle revoked credential", () => {
      const block = createBlock("credential", {
        type: "credential",
        content: "Revoked credential",
        tags: ["credential", "revoked"],
        schema: "KYCCredential",
        issuer: "did:example:issuer",
        holder: "did:example:holder",
        proof: "revocation-proof",
        revoked: true,
      });

      const result = validateBlockAgainstSoul(block);
      expect(result.valid).toBe(true);
    });
  });

  describe("Real World Scenarios", () => {
    it("should store email verification credential", () => {
      const block = createBlock("credential", {
        type: "credential",
        content: "Email verified",
        tags: ["credential", "email", "verified"],
        schema: "EmailVerification",
        issuer: "did:web:auth.example.com",
        holder: "did:web:user.example.com",
      });

      const result = validateBlockAgainstSoul(block);
      expect(result.valid).toBe(true);
    });

    it("should store payment credential", () => {
      const block = createBlock("credential", {
        type: "credential",
        content: "Payment method verified",
        tags: ["credential", "payment", "verified"],
        schema: "PaymentMethodCredential",
        issuer: "did:web:stripe.com",
        holder: "did:web:customer.example.com",
      });

      const result = validateBlockAgainstSoul(block);
      expect(result.valid).toBe(true);
    });

    it("should handle proof/verification data", () => {
      const block = createBlock("credential", {
        type: "credential",
        content: "Signed credential",
        tags: ["credential", "signed"],
        schema: "VerifiableCredential",
        issuer: "did:ethr:0xabc123",
        holder: "did:web:user.example",
        proof: "EthereumSignedMessage:...",
      });

      const result = validateBlockAgainstSoul(block);
      expect(result.valid).toBe(true);
      expect(block.data.proof).toBeDefined();
    });
  });
});
