import { describe, it, expect } from "vitest";
import { createBlock, validateBlockAgainstSoul } from "../../src/memory/chain.js";

describe("Decisions Security & Validation", () => {
  describe("Decision Block Validation", () => {
    it("should accept valid decision block", () => {
      const block = createBlock("decisions", {
        type: "decision",
        content: JSON.stringify({
          decisionId: "abc123",
          title: "Use TypeScript",
          chosen: "TypeScript",
          reasoning: "Type safety improves DX",
          mode: "conscious",
          scope: "project",
          status: "active",
        }),
        tags: ["decision", "conscious", "project", "active"],
      });

      const result = validateBlockAgainstSoul(block);
      expect(result.valid).toBe(true);
    });

    it("should accept decision with all fields", () => {
      const block = createBlock("decisions", {
        type: "decision",
        content: JSON.stringify({
          decisionId: "def456",
          title: "Use local LLM",
          chosen: "Ollama",
          reasoning: "Privacy + sovereignty",
          confidence: 95,
          mode: "conscious",
          scope: "project",
          status: "active",
          options: ["Ollama", "OpenAI", "Cloud"],
          links: ["https://ollama.ai"],
          evidence: ["Local processing", "No data leaves machine"],
          createdAt: "2026-02-20T10:00:00Z",
          metadata: {
            projectPath: "/home/user/memphis",
            files: ["src/providers/ollama.ts"],
          },
        }),
        tags: ["decision", "conscious", "project", "active"],
      });

      const result = validateBlockAgainstSoul(block);
      expect(result.valid).toBe(true);
    });
  });

  describe("Decision Schema Validation", () => {
    it("should parse decision JSON content", () => {
      const decisionData = {
        decisionId: "xyz789",
        title: "Migrate to new architecture",
        chosen: "Microservices",
        reasoning: "Better scalability",
        mode: "conscious",
        scope: "project",
        status: "active",
      };

      const block = createBlock("decisions", {
        type: "decision",
        content: JSON.stringify(decisionData),
        tags: ["decision"],
      });

      const parsed = JSON.parse(block.data.content);
      expect(parsed.decisionId).toBe("xyz789");
      expect(parsed.chosen).toBe("Microservices");
    });

    it("should handle missing optional fields", () => {
      const block = createBlock("decisions", {
        type: "decision",
        content: JSON.stringify({
          decisionId: "min123",
          title: "Simple decision",
          chosen: "Option A",
        }),
        tags: ["decision"],
      });

      const result = validateBlockAgainstSoul(block);
      expect(result.valid).toBe(true);

      const parsed = JSON.parse(block.data.content);
      expect(parsed.decisionId).toBe("min123");
    });
  });

  describe("Decision Modes", () => {
    it("should accept conscious mode decision", () => {
      const block = createBlock("decisions", {
        type: "decision",
        content: JSON.stringify({
          decisionId: "con001",
          title: "Manual choice",
          chosen: "Option B",
          mode: "conscious",
        }),
        tags: ["decision", "conscious"],
      });

      const result = validateBlockAgainstSoul(block);
      expect(result.valid).toBe(true);
    });

    it("should accept inferred mode decision", () => {
      const block = createBlock("decisions", {
        type: "decision",
        content: JSON.stringify({
          decisionId: "inf001",
          title: "Inferred preference",
          chosen: "Dark mode",
          mode: "inferred",
        }),
        tags: ["decision", "inferred"],
      });

      const result = validateBlockAgainstSoul(block);
      expect(result.valid).toBe(true);
    });
  });

  describe("Decision Scopes", () => {
    it("should accept project scope", () => {
      const block = createBlock("decisions", {
        type: "decision",
        content: JSON.stringify({
          decisionId: "proj001",
          title: "Project decision",
          chosen: "Use pnpm",
          scope: "project",
        }),
        tags: ["decision", "project"],
      });

      const result = validateBlockAgainstSoul(block);
      expect(result.valid).toBe(true);
    });

    it("should accept personal scope", () => {
      const block = createBlock("decisions", {
        type: "decision",
        content: JSON.stringify({
          decisionId: "pers001",
          title: "Personal preference",
          chosen: "VS Code",
          scope: "personal",
        }),
        tags: ["decision", "personal"],
      });

      const result = validateBlockAgainstSoul(block);
      expect(result.valid).toBe(true);
    });

    it("should accept life scope", () => {
      const block = createBlock("decisions", {
        type: "decision",
        content: JSON.stringify({
          decisionId: "life001",
          title: "Life decision",
          chosen: "Remote work",
          scope: "life",
        }),
        tags: ["decision", "life"],
      });

      const result = validateBlockAgainstSoul(block);
      expect(result.valid).toBe(true);
    });
  });

  describe("Decision Status", () => {
    it("should accept active status", () => {
      const block = createBlock("decisions", {
        type: "decision",
        content: JSON.stringify({
          decisionId: "act001",
          title: "Active decision",
          chosen: "Yes",
          status: "active",
        }),
        tags: ["decision", "active"],
      });

      const result = validateBlockAgainstSoul(block);
      expect(result.valid).toBe(true);
    });

    it("should accept superseded status", () => {
      const block = createBlock("decisions", {
        type: "decision",
        content: JSON.stringify({
          decisionId: "sup001",
          title: "Old decision",
          chosen: "Old option",
          status: "superseded",
        }),
        tags: ["decision", "superseded"],
      });

      const result = validateBlockAgainstSoul(block);
      expect(result.valid).toBe(true);
    });

    it("should accept rejected status", () => {
      const block = createBlock("decisions", {
        type: "decision",
        content: JSON.stringify({
          decisionId: "rej001",
          title: "Rejected option",
          chosen: "Option X",
          status: "rejected",
        }),
        tags: ["decision", "rejected"],
      });

      const result = validateBlockAgainstSoul(block);
      expect(result.valid).toBe(true);
    });
  });

  describe("Decision Revisions", () => {
    it("should link to previous decision via metadata", () => {
      const block = createBlock("decisions", {
        type: "decision",
        content: JSON.stringify({
          decisionId: "rev001",
          title: "Revised decision",
          chosen: "New choice",
          previousDecisionId: "orig001",
          revisionReason: "New information",
        }),
        tags: ["decision", "revision"],
      });

      const result = validateBlockAgainstSoul(block);
      expect(result.valid).toBe(true);

      const parsed = JSON.parse(block.data.content);
      expect(parsed.previousDecisionId).toBe("orig001");
      expect(parsed.revisionReason).toBe("New information");
    });
  });

  describe("Real World Scenarios", () => {
    it("should store architecture decision", () => {
      const block = createBlock("decisions", {
        type: "decision",
        content: JSON.stringify({
          decisionId: "arch001",
          title: "Use local-first architecture",
          chosen: "Blockchain-based memory",
          reasoning: "Sovereignty + offline capability",
          confidence: 90,
          mode: "conscious",
          scope: "project",
          status: "active",
          options: [
            "Blockchain-based memory",
            "Traditional database",
            "File-based storage",
          ],
          links: [
            "https://arxiv.org/abs/...",
          ],
          metadata: {
            projectPath: "~/memphis",
          },
        }),
        tags: ["decision", "architecture", "project", "active"],
      });

      const result = validateBlockAgainstSoul(block);
      expect(result.valid).toBe(true);
    });

    it("should store tech stack decision", () => {
      const block = createBlock("decisions", {
        type: "decision",
        content: JSON.stringify({
          decisionId: "tech001",
          title: "Choose runtime",
          chosen: "Node.js + Deno",
          reasoning: "TypeScript native, modern APIs",
          confidence: 85,
          mode: "conscious",
          scope: "project",
          status: "active",
          evidence: [
            "Native TypeScript support",
            "Broad ecosystem",
          ],
        }),
        tags: ["decision", "tech-stack", "project", "active"],
      });

      const result = validateBlockAgainstSoul(block);
      expect(result.valid).toBe(true);
    });

    it("should track decision confidence levels", () => {
      const highConfidence = createBlock("decisions", {
        type: "decision",
        content: JSON.stringify({
          decisionId: "conf001",
          title: "High confidence",
          chosen: "A",
          confidence: 95,
        }),
        tags: ["decision", "high-confidence"],
      });

      // Just validate individually - chain linking tested separately
      const result1 = validateBlockAgainstSoul(highConfidence);

      expect(result1.valid).toBe(true);
      expect(JSON.parse(highConfidence.data.content).confidence).toBe(95);
    });
  });
});
