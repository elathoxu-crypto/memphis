import { describe, expect, it, beforeAll, vi } from "vitest";
import { mkdtempSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const TEST_HOME = mkdtempSync(join(tmpdir(), "memphis-semantic-"));
process.env.MEMPHIS_HOME = TEST_HOME;
const CONFIG_FILE = join(TEST_HOME, "config.yaml");
const CHAINS_PATH = join(TEST_HOME, "chains");
const EMBEDDINGS_PATH = join(TEST_HOME, "embeddings");

mkdirSync(CHAINS_PATH, { recursive: true });
mkdirSync(EMBEDDINGS_PATH, { recursive: true });
writeFileSync(
  CONFIG_FILE,
  `embeddings:\n  enabled: true\n  backend: mock\n  storage_path: ${EMBEDDINGS_PATH}\n  top_k: 5\n  semantic_weight: 0.7\n`
);

vi.mock("../../src/config/defaults.ts", async () => {
  const actual = await vi.importActual<typeof import("../../src/config/defaults.ts")>("../../src/config/defaults.ts");
  return {
    ...actual,
    MEMPHIS_HOME: TEST_HOME,
    CONFIG_PATH: CONFIG_FILE,
    CHAINS_PATH,
    EMBEDDINGS_PATH,
    DEFAULT_CONFIG: {
      ...actual.DEFAULT_CONFIG,
      memory: { ...actual.DEFAULT_CONFIG.memory, path: CHAINS_PATH },
      embeddings: {
        ...actual.DEFAULT_CONFIG.embeddings,
        enabled: true,
        backend: "mock",
        storage_path: EMBEDDINGS_PATH,
        top_k: 5,
        semantic_weight: 0.7,
      },
    },
  };
});

vi.mock("../../src/embeddings/backends/local.ts", () => {
  class MockBackend {
    readonly name = "mock-local";
    readonly model = "mock-embed";
    async init() {
      return;
    }
    async embedBlocks(blocks: any[]) {
      return blocks.map(block => (block.data?.content?.toLowerCase().includes("semantic") ? [1, 0, 0, 0] : [0, 1, 0, 0]));
    }
  }
  return { LocalOllamaBackend: MockBackend };
});

const { recall } = await import("../../src/core/recall.ts");
const { Store } = await import("../../src/memory/store.ts");

function writeBlock(chainDir: string, index: number, content: string) {
  const block = {
    index,
    hash: `hash-${index}`,
    prevHash: index === 1 ? null : `hash-${index - 1}`,
    timestamp: new Date(Date.now() - (10 - index) * 1000).toISOString(),
    signature: null,
    data: {
      type: "journal",
      content,
      tags: ["recall"],
    },
  };
  mkdirSync(chainDir, { recursive: true });
  const filePath = join(chainDir, `${String(index).padStart(6, "0")}.json`);
  writeFileSync(filePath, JSON.stringify(block, null, 2));
  return block;
}

beforeAll(() => {
  const chainDir = join(CHAINS_PATH, "journal");
  const targetBlock = writeBlock(chainDir, 1, "Explored semantic recall scoring and embeddings pipeline");
  writeBlock(chainDir, 2, "Unrelated entry about share replicator");

  const journalDir = join(EMBEDDINGS_PATH, "journal");
  const blocksDir = join(journalDir, "blocks");
  mkdirSync(blocksDir, { recursive: true });
  const now = new Date().toISOString();
  writeFileSync(
    join(journalDir, "index.json"),
    JSON.stringify(
      [
        {
          hash: targetBlock.hash,
          blockIndex: targetBlock.index,
          updatedAt: now,
        },
      ],
      null,
      2
    )
  );
  writeFileSync(
    join(blocksDir, `${targetBlock.index}.json`),
    JSON.stringify(
      {
        hash: targetBlock.hash,
        vector: [1, 0, 0, 0],
        createdAt: now,
      },
      null,
      2
    )
  );
});

describe("Semantic recall", () => {
  it("returns semantic hits when embeddings exist", async () => {
    const store = new Store(CHAINS_PATH);
    const result = await recall(store, {
      text: "semantic recall design",
      limit: 5,
      semanticOnly: true,
    });

    expect(result.hits.length).toBeGreaterThan(0);
    expect(result.hits[0].chain).toBe("journal");
    expect(result.hits[0].index).toBe(1);
    expect(result.hits[0].score).toBeGreaterThan(0.3);
  });
});
