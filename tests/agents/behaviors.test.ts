import { describe, it, expect } from "vitest";
import {
  getGreeting,
  acknowledgeTask,
  acknowledgeDone,
  askClarification,
  admitUnknown,
  createClineTaskBlock,
  createClineDoneBlock,
} from "../../src/agents/behaviors.js";

describe("behaviors", () => {
  describe("getGreeting", () => {
    it("should return greeting based on time", () => {
      const greeting = getGreeting();
      const validGreetings = [
        "Dobranoc. Jestem.",
        "Dzień dobry. Jestem.",
        "Cześć. Jestem.",
        "Dobry wieczór. Jestem.",
      ];
      
      expect(validGreetings).toContain(greeting);
    });
  });

  describe("acknowledgeTask", () => {
    it("should acknowledge task with 📝 marker", () => {
      const result = acknowledgeTask("Refaktoryzuj plik X");
      expect(result).toContain("📝");
      expect(result).toContain("Zrozumiałem");
      expect(result).toContain("Refaktoryzuj plik X");
    });
  });

  describe("acknowledgeDone", () => {
    it("should acknowledge completion with ✅", () => {
      const result = acknowledgeDone("Zadanie ukończone");
      expect(result).toContain("✅");
      expect(result).toContain("Zapisane");
      expect(result).toContain("Zadanie ukończone");
    });
  });

  describe("askClarification", () => {
    it("should ask for clarification with ❓", () => {
      const result = askClarification("Co dokładnie mam zrobić?");
      expect(result).toContain("❓");
      expect(result).toContain("Pytanie");
      expect(result).toContain("Co dokładnie mam zrobić?");
    });
  });

  describe("admitUnknown", () => {
    it("should admit uncertainty with 🤔", () => {
      const result = admitUnknown();
      expect(result).toContain("🤔");
      expect(result).toContain("Nie wiem");
    });
  });

  describe("createClineTaskBlock", () => {
    it("should create task block with correct tags", () => {
      const block = createClineTaskBlock("Zrób coś");
      expect(block.content).toContain("cline:task");
      expect(block.content).toContain("Zrób coś");
      expect(block.tags).toContain("cline");
      expect(block.tags).toContain("task");
      expect(block.tags).toContain("memphis");
    });
  });

  describe("createClineDoneBlock", () => {
    it("should create done block with correct tags", () => {
      const block = createClineDoneBlock("Zrobione");
      expect(block.content).toContain("cline:done");
      expect(block.content).toContain("Zrobione");
      expect(block.tags).toContain("cline");
      expect(block.tags).toContain("done");
      expect(block.tags).toContain("memphis");
    });
  });
});
