import { describe, it, expect } from "vitest";
import { loadConfig } from "../../src/config/loader.js";

describe("Config Loader - Path Resolution", () => {
  it("should resolve ~ in memory.path to homedir", () => {
    const config = loadConfig();
    
    // Path should be resolved from ~/.memphis/chains to actual homedir
    expect(config.memory.path).toContain("/.memphis/chains");
    expect(config.memory.path).not.toContain("~");
    expect(config.memory.path).toContain(process.env.HOME || process.env.USERPROFILE);
  });

  it("should have correct chains path", () => {
    const config = loadConfig();
    
    // Default should be ~/.memphis/chains
    expect(config.memory.path).toMatch(/\/\.memphis\/chains$/);
  });
});
