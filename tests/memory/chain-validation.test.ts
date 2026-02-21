import { describe, it, expect } from "vitest";
import { validateBlockAgainstSoul, verifyChain, createBlock } from "../../src/memory/chain.js";

describe("Chain Validation - ALLOWED_TYPES", () => {
  it("should accept standard journal type", () => {
    const block = createBlock("journal", {
      type: "journal",
      content: "test content",
      tags: ["test"],
    });
    
    const result = validateBlockAgainstSoul(block);
    expect(result.valid).toBe(true);
  });

  it("should accept decision type", () => {
    const block = createBlock("decisions", {
      type: "decision",
      content: '{"title": "Test decision"}',
      tags: ["decision", "test"],
    });
    
    const result = validateBlockAgainstSoul(block);
    expect(result.valid).toBe(true);
  });

  it("should accept project_task type (legacy)", () => {
    const block = createBlock("journal", {
      type: "project_task",
      task: "Fix bug",
      project: "memphis",
      tags: ["project"],
    });
    
    const result = validateBlockAgainstSoul(block);
    expect(result.valid).toBe(true);
  });

  it("should accept break_task type (legacy)", () => {
    const block = createBlock("journal", {
      type: "break_task",
      task: "Review code",
      project: "memphis",
      description: "Review TUI code",
      tags: ["break"],
    });
    
    const result = validateBlockAgainstSoul(block);
    expect(result.valid).toBe(true);
  });

  it("should accept break_work type (legacy)", () => {
    const block = createBlock("journal", {
      type: "break_work",
      project: "memphis",
      task: "Optimize",
      tags: ["work"],
    });
    
    const result = validateBlockAgainstSoul(block);
    expect(result.valid).toBe(true);
  });

  it("should accept project_task_complete type (legacy)", () => {
    const block = createBlock("journal", {
      type: "project_task_complete",
      project: "memphis",
      task: "Done!",
      tags: ["complete"],
    });
    
    const result = validateBlockAgainstSoul(block);
    expect(result.valid).toBe(true);
  });

  it("should reject invalid type", () => {
    const block = createBlock("journal", {
      type: "invalid_type" as any,
      content: "test",
      tags: ["test"],
    });
    
    const result = validateBlockAgainstSoul(block);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain("Invalid type");
  });
});

describe("Chain Validation - Legacy Block Support", () => {
  it("should accept legacy block with data.data field", () => {
    const block = createBlock("journal", {
      type: "project_task",
      content: "", // old format had empty content
      tags: [],
      // Legacy: data nested in data.data
      data: {
        type: "project_task",
        project: "memphis-security-patches",
        task: "Vault Security Fixes",
        blocks: [{ id: 1, name: "Test", status: "done" }],
      },
    });
    
    const result = validateBlockAgainstSoul(block);
    expect(result.valid).toBe(true);
  });

  it("should accept legacy flat structure (task, project)", () => {
    const block = createBlock("journal", {
      type: "break_task",
      content: "",
      tags: [],
      task: "Review TUI",
      project: "memphis",
      description: "Find bottlenecks",
    });
    
    const result = validateBlockAgainstSoul(block);
    expect(result.valid).toBe(true);
  });

  it("should require either content, data, or task", () => {
    const block = createBlock("journal", {
      type: "journal",
      content: "",
      tags: [],
      // No content, no data, no task
    });
    
    const result = validateBlockAgainstSoul(block);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain("Content must be");
  });
});

describe("verifyChain", () => {
  it("should validate chain with mixed legacy and new blocks", () => {
    // Create genesis
    const genesis = createBlock("journal", {
      type: "journal",
      content: "Genesis",
      tags: ["genesis"],
    });
    
    // Legacy block
    const legacy = createBlock("journal", {
      type: "project_task",
      task: "Test",
      project: "test",
      tags: ["test"],
    }, genesis);
    
    // New format block
    const modern = createBlock("journal", {
      type: "journal",
      content: "Modern block",
      tags: ["test"],
    }, legacy);
    
    const result = verifyChain([genesis, legacy, modern]);
    expect(result.valid).toBe(true);
  });

  it("should detect broken chain link", () => {
    const block1 = createBlock("journal", {
      type: "journal",
      content: "Block 1",
      tags: [],
    });
    
    const block2 = createBlock("journal", {
      type: "journal",
      content: "Block 2",
      tags: [],
    }, {
      ...block1,
      hash: "wrong_hash_0000000000000000000000000000000000000000000000000000000000000000",
    } as any);
    
    const result = verifyChain([block1, block2]);
    expect(result.valid).toBe(false);
  });
});
