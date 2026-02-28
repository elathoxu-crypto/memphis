/**
 * Knowledge Graph Overlay for Memphis
 *
 * Builds a graph of semantic relationships between blocks across chains.
 * Nodes = blocks, Edges = similarity above threshold.
 * Stored in ~/.memphis/graph/ as JSONL for portability.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { Store } from "../memory/store.js";
import { loadSemanticIndex } from "../embeddings/loader.js";
import { LocalOllamaBackend } from "../embeddings/backends/local.js";

const MEMPHIS_HOME = process.env.MEMPHIS_HOME || path.join(os.homedir(), ".memphis");
const GRAPH_DIR = path.join(MEMPHIS_HOME, "graph");

export interface GraphNode {
  id: string; // "<chain>:<index>"
  chain: string;
  index: number;
  type: string;
  tags: string[];
  timestamp: string;
  snippet: string;
}

export interface GraphEdge {
  from: string; // "<chain>:<index>"
  to: string;
  score: number;
  type: "semantic" | "tag" | "ref";
}

export interface GraphStats {
  nodes: number;
  edges: number;
  chains: string[];
  builtAt: string;
  durationMs: number;
}

export interface BuildOptions {
  chains?: string[];
  threshold?: number; // cosine similarity threshold (default: 0.75)
  limit?: number;     // max nodes to process
  dryRun?: boolean;
}

export interface GraphQueryOptions {
  nodeId?: string;     // start from node, show neighbors
  chain?: string;      // filter by chain
  tag?: string;        // filter by tag
  depth?: number;      // traversal depth (default: 1)
  minScore?: number;
}

function ensureDir(dir: string) {
  mkdirSync(dir, { recursive: true });
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export class GraphStore {
  private nodesFile: string;
  private edgesFile: string;
  private metaFile: string;

  constructor() {
    ensureDir(GRAPH_DIR);
    this.nodesFile = path.join(GRAPH_DIR, "nodes.jsonl");
    this.edgesFile = path.join(GRAPH_DIR, "edges.jsonl");
    this.metaFile = path.join(GRAPH_DIR, "meta.json");
  }

  loadNodes(): GraphNode[] {
    if (!existsSync(this.nodesFile)) return [];
    return readFileSync(this.nodesFile, "utf-8")
      .split("\n")
      .filter(Boolean)
      .map(line => JSON.parse(line) as GraphNode);
  }

  loadEdges(): GraphEdge[] {
    if (!existsSync(this.edgesFile)) return [];
    return readFileSync(this.edgesFile, "utf-8")
      .split("\n")
      .filter(Boolean)
      .map(line => JSON.parse(line) as GraphEdge);
  }

  saveNodes(nodes: GraphNode[]) {
    writeFileSync(this.nodesFile, nodes.map(n => JSON.stringify(n)).join("\n") + "\n");
  }

  saveEdges(edges: GraphEdge[]) {
    writeFileSync(this.edgesFile, edges.map(e => JSON.stringify(e)).join("\n") + "\n");
  }

  saveMeta(stats: GraphStats) {
    writeFileSync(this.metaFile, JSON.stringify(stats, null, 2));
  }

  loadMeta(): GraphStats | null {
    if (!existsSync(this.metaFile)) return null;
    try {
      return JSON.parse(readFileSync(this.metaFile, "utf-8")) as GraphStats;
    } catch {
      return null;
    }
  }

  query(options: GraphQueryOptions): { nodes: GraphNode[]; edges: GraphEdge[] } {
    const allNodes = this.loadNodes();
    const allEdges = this.loadEdges();
    const depth = options.depth ?? 1;
    const minScore = options.minScore ?? 0;

    // Build node index
    const nodeMap = new Map<string, GraphNode>();
    for (const n of allNodes) nodeMap.set(n.id, n);

    // Filter starting nodes
    let startNodes = allNodes;
    if (options.nodeId) {
      startNodes = allNodes.filter(n => n.id === options.nodeId);
    } else if (options.chain) {
      startNodes = allNodes.filter(n => n.chain === options.chain);
    } else if (options.tag) {
      startNodes = allNodes.filter(n => n.tags.includes(options.tag!));
    }

    // BFS traversal
    const visited = new Set<string>(startNodes.map(n => n.id));
    const resultEdges: GraphEdge[] = [];
    let frontier = startNodes.map(n => n.id);

    for (let d = 0; d < depth; d++) {
      const nextFrontier: string[] = [];
      for (const id of frontier) {
        const edges = allEdges.filter(
          e => (e.from === id || e.to === id) && e.score >= minScore
        );
        for (const edge of edges) {
          resultEdges.push(edge);
          const neighbor = edge.from === id ? edge.to : edge.from;
          if (!visited.has(neighbor)) {
            visited.add(neighbor);
            nextFrontier.push(neighbor);
          }
        }
      }
      frontier = nextFrontier;
    }

    const resultNodes = Array.from(visited)
      .map(id => nodeMap.get(id))
      .filter((n): n is GraphNode => Boolean(n));

    // Deduplicate edges
    const edgeSet = new Map<string, GraphEdge>();
    for (const e of resultEdges) {
      const key = [e.from, e.to].sort().join("--");
      if (!edgeSet.has(key) || edgeSet.get(key)!.score < e.score) {
        edgeSet.set(key, e);
      }
    }

    return { nodes: resultNodes, edges: Array.from(edgeSet.values()) };
  }
}

export class GraphBuilder {
  constructor(private store: Store, private graphStore: GraphStore) {}

  async build(options: BuildOptions = {}): Promise<GraphStats> {
    const start = Date.now();
    const threshold = options.threshold ?? 0.75;
    const chains = options.chains ?? this.store.listChains().filter(c => c !== "vault" && c !== "credential");

    // Build nodes from blocks
    const nodes: GraphNode[] = [];
    const vectorMap = new Map<string, number[]>(); // nodeId -> vector

    for (const chain of chains) {
      const blocks = this.store.readChain(chain);
      const semanticIndex = loadSemanticIndex(chain);

      const vectorByHash = new Map<string, number[]>();
      for (const entry of semanticIndex) {
        if (entry.hash && entry.vector) {
          vectorByHash.set(entry.hash, entry.vector);
        }
      }

      for (const block of blocks) {
        const nodeId = `${chain}:${block.index}`;
        const snippet = block.data.content.slice(0, 120).replace(/\n/g, " ");

        nodes.push({
          id: nodeId,
          chain,
          index: block.index,
          type: block.data.type,
          tags: block.data.tags ?? [],
          timestamp: block.timestamp,
          snippet,
        });

        const vec = block.hash ? vectorByHash.get(block.hash) : undefined;
        if (vec) vectorMap.set(nodeId, vec);
      }
    }

    const limit = options.limit ?? nodes.length;
    const processedNodes = nodes.slice(0, limit);

    if (!options.dryRun) {
      this.graphStore.saveNodes(processedNodes);
    }

    // Build edges: semantic similarity + tag overlap + context_refs
    const edges: GraphEdge[] = [];
    const embeddedNodes = processedNodes.filter(n => vectorMap.has(n.id));

    // Semantic edges (O(n²) but bounded by limit)
    for (let i = 0; i < embeddedNodes.length; i++) {
      for (let j = i + 1; j < embeddedNodes.length; j++) {
        const a = embeddedNodes[i];
        const b = embeddedNodes[j];
        const vecA = vectorMap.get(a.id)!;
        const vecB = vectorMap.get(b.id)!;
        const score = cosineSimilarity(vecA, vecB);
        if (score >= threshold) {
          edges.push({ from: a.id, to: b.id, score: Math.round(score * 1000) / 1000, type: "semantic" });
        }
      }
    }

    // Tag overlap edges
    const tagIndex = new Map<string, string[]>(); // tag -> nodeIds
    for (const node of processedNodes) {
      for (const tag of node.tags) {
        if (!tagIndex.has(tag)) tagIndex.set(tag, []);
        tagIndex.get(tag)!.push(node.id);
      }
    }

    const tagEdgeSet = new Set<string>();
    for (const [, nodeIds] of tagIndex) {
      if (nodeIds.length < 2 || nodeIds.length > 50) continue; // skip too-common tags
      for (let i = 0; i < nodeIds.length; i++) {
        for (let j = i + 1; j < nodeIds.length; j++) {
          const key = [nodeIds[i], nodeIds[j]].sort().join("--");
          if (!tagEdgeSet.has(key)) {
            tagEdgeSet.add(key);
            edges.push({ from: nodeIds[i], to: nodeIds[j], score: 0.5, type: "tag" });
          }
        }
      }
    }

    // Context_ref edges (from ask blocks)
    for (const chain of chains) {
      const blocks = this.store.readChain(chain);
      for (const block of blocks) {
        if (block.data.context_refs) {
          for (const ref of block.data.context_refs) {
            const fromId = `${chain}:${block.index}`;
            const toId = `${ref.chain}:${ref.index}`;
            edges.push({ from: fromId, to: toId, score: ref.score, type: "ref" });
          }
        }
      }
    }

    const stats: GraphStats = {
      nodes: processedNodes.length,
      edges: edges.length,
      chains,
      builtAt: new Date().toISOString(),
      durationMs: Date.now() - start,
    };

    if (!options.dryRun) {
      this.graphStore.saveEdges(edges);
      this.graphStore.saveMeta(stats);
    }

    return stats;
  }
}
