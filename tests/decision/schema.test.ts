import { describe, it, expect } from "vitest";
import { createDecisionV1, parseDecisionV1, DECISION_SCHEMA_VERSION } from "../../src/decision/schema.js";

describe("decision schema v1", () => {
  it("creates and parses a valid conscious decision", () => {
    const d = createDecisionV1({
      title: "Memphis = cognitive engine (decisions)",
      options: ["A: notes", "B: context engine", "C: decision memory"],
      chosen: "C: decision memory",
      reasoning: "Unique value: why + alternatives.",
      context: "Product direction call",
      confidence: 0.85,
      mode: "conscious",
      scope: "life",
    });

    expect(d.schema).toBe(DECISION_SCHEMA_VERSION);
    expect(d.decisionId.length).toBeGreaterThanOrEqual(8);
    expect(d.recordId.length).toBeGreaterThanOrEqual(8);
    expect(d.mode).toBe("conscious");
    expect(d.chosen).toContain("decision memory");

    const roundtrip = parseDecisionV1(JSON.stringify(d));
    expect(roundtrip.decisionId).toBe(d.decisionId);
    expect(roundtrip.recordId).toBe(d.recordId);
  });

  it("rejects when chosen is not one of options", () => {
    expect(() =>
      createDecisionV1({
        title: "Bad",
        options: ["A", "B"],
        chosen: "C",
      })
    ).toThrow();
  });
});
