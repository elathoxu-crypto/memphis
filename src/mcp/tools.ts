export type MemphisToolName =
  | "memphis.search"
  | "memphis.recall"
  | "memphis.decision.create"
  | "memphis.journal.add"
  | "memphis.status";

export interface JsonSchema {
  type: string;
  description?: string;
  enum?: string[];
  items?: JsonSchema;
  properties?: Record<string, JsonSchema>;
  required?: string[];
  additionalProperties?: boolean;
  minimum?: number;
  maximum?: number;
  format?: string;
}

export interface ObjectSchema extends JsonSchema {
  type: "object";
  properties: Record<string, JsonSchema>;
  required?: string[];
  additionalProperties?: boolean;
}

export interface MemphisToolDefinition {
  name: MemphisToolName;
  description: string;
  inputSchema: ObjectSchema;
}

export interface MemphisSearchInput {
  query: string;
  chain?: string;
  limit?: number;
  type?: string;
  tag?: string;
  since?: string;
  until?: string;
  includeVault?: boolean;
  semanticWeight?: number;
  semanticOnly?: boolean;
}

export interface MemphisRecallInput {
  query?: string;
  chain?: string;
  type?: string;
  tag?: string;
  since?: string;
  until?: string;
  limit?: number;
  includeVault?: boolean;
}

export interface MemphisDecisionCreateInput {
  title: string;
  options?: string[];
  chosen: string;
  reasoning?: string;
  context?: string;
  tags?: string[];
  links?: string[];
  confidence?: number;
  mode?: "conscious" | "inferred";
  scope?: "personal" | "project" | "life";
  status?: "active" | "revised" | "deprecated" | "contradicted";
  decisionId?: string;
  supersedes?: string;
  evidenceRefs?: string[];
  evidenceNote?: string;
}

export interface MemphisJournalAddInput {
  content: string;
  tags?: string[];
  chain?: string;
  type?: string;
  agent?: string;
}

export interface MemphisStatusInput {
  verbose?: boolean;
}

export interface MemphisToolInputMap {
  "memphis.search": MemphisSearchInput;
  "memphis.recall": MemphisRecallInput;
  "memphis.decision.create": MemphisDecisionCreateInput;
  "memphis.journal.add": MemphisJournalAddInput;
  "memphis.status": MemphisStatusInput;
}

const booleanSchema = (description: string): JsonSchema => ({
  type: "boolean",
  description,
});

const stringSchema = (description: string, format?: string, enumValues?: string[]): JsonSchema => {
  const schema: JsonSchema = { type: "string", description };
  if (format) schema.format = format;
  if (enumValues) schema.enum = enumValues;
  return schema;
};

const numberSchema = (description: string, minimum?: number, maximum?: number): JsonSchema => {
  const schema: JsonSchema = { type: "number", description };
  if (minimum !== undefined) schema.minimum = minimum;
  if (maximum !== undefined) schema.maximum = maximum;
  return schema;
};

const stringArraySchema = (description: string): JsonSchema => ({
  type: "array",
  description,
  items: { type: "string", description: `${description} (item)` },
});

export const memphisToolDefinitions: MemphisToolDefinition[] = [
  {
    name: "memphis.search",
    description: "Search Memphis memory using blended keyword and semantic recall.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      required: ["query"],
      properties: {
        query: stringSchema("Full-text or natural language search query."),
        chain: stringSchema("Restrict results to a specific chain."),
        limit: numberSchema("Maximum number of hits to return (default: 20).", 1, 100),
        type: stringSchema("Filter by block type (journal, ask, decision, etc.)."),
        tag: stringSchema("Filter results by tag."),
        since: stringSchema("Only include blocks newer than ISO date (YYYY-MM-DD).", "date-time"),
        until: stringSchema("Only include blocks older than ISO date.", "date-time"),
        includeVault: booleanSchema("Include vault/credential chains in search results."),
        semanticWeight: numberSchema("Semantic weight blend ratio (0-1).", 0, 1),
        semanticOnly: booleanSchema("Return only semantic hits (ignore keyword search)."),
      },
    },
  },
  {
    name: "memphis.recall",
    description: "Recall raw memory blocks with structured filters.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        query: stringSchema("Optional keyword filter."),
        chain: stringSchema("Restrict to a specific chain."),
        type: stringSchema("Filter by block type."),
        tag: stringSchema("Filter on an exact tag."),
        since: stringSchema("Only include blocks newer than ISO date.", "date-time"),
        until: stringSchema("Only include blocks older than ISO date.", "date-time"),
        limit: numberSchema("Maximum number of blocks to return (default: 20).", 1, 200),
        includeVault: booleanSchema("Include vault and credential chains."),
      },
    },
  },
  {
    name: "memphis.decision.create",
    description: "Record a structured decision inside the decisions chain.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      required: ["title", "chosen"],
      properties: {
        title: stringSchema("Decision title or statement."),
        options: stringArraySchema("List of considered options."),
        chosen: stringSchema("Chosen option identifier."),
        reasoning: stringSchema("Reasoning or rationale for the decision."),
        context: stringSchema("Supporting context or evidence."),
        tags: stringArraySchema("Additional tags to attach to the block."),
        links: stringArraySchema("Reference links that informed the decision."),
        confidence: numberSchema("Confidence between 0 and 1.", 0, 1),
        mode: stringSchema("Decision mode.", undefined, ["conscious", "inferred"]),
        scope: stringSchema("Decision scope.", undefined, ["personal", "project", "life"]),
        status: stringSchema("Lifecycle status.", undefined, ["active", "revised", "deprecated", "contradicted"]),
        decisionId: stringSchema("Custom decision identifier."),
        supersedes: stringSchema("Decision ID this record supersedes."),
        evidenceRefs: stringArraySchema("Evidence references for inferred decisions."),
        evidenceNote: stringSchema("Additional note describing the evidence."),
      },
    },
  },
  {
    name: "memphis.journal.add",
    description: "Append a journal entry to any accessible chain.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      required: ["content"],
      properties: {
        content: stringSchema("Body of the entry to store."),
        tags: stringArraySchema("Optional tags for the entry."),
        chain: stringSchema("Target chain (default: journal)."),
        type: stringSchema("Block type (default: journal)."),
        agent: stringSchema("Agent label recorded with the block."),
      },
    },
  },
  {
    name: "memphis.status",
    description: "Return the current Memphis status report (chains, providers, embeddings).",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        verbose: booleanSchema("Include extended embedding and provider details."),
      },
    },
  },
];
