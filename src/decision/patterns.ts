/**
 * Decision Patterns Database
 * 
 * Regex patterns for detecting decisions from commits, branches, files
 */

export interface DecisionPattern {
  regex: RegExp;
  type: "strategic" | "tactical" | "technical";
  confidence: number;
  template: string;
  category: string;
}

export interface BranchPattern {
  pattern: string;
  confidence: number;
  template: string;
  category: string;
}

export const COMMIT_PATTERNS: DecisionPattern[] = [
  // Direction changes
  {
    regex: /refactor:?\s+(.+?)\s*(?:→|->|to)\s*(.+)/i,
    type: "technical",
    confidence: 0.75,
    template: "Refactored {1} to {2}",
    category: "refactoring"
  },
  {
    regex: /migrate:?\s+(?:from\s+)?(.+?)\s+to\s+(.+)/i,
    type: "strategic",
    confidence: 0.80,
    template: "Migrated from {1} to {2}",
    category: "migration"
  },
  {
    regex: /switch:?\s+(?:to\s+)?(.+?)\s+(?:from|instead of)\s+(.+)/i,
    type: "technical",
    confidence: 0.75,
    template: "Switched to {1} from {2}",
    category: "technology"
  },

  // Strategic decisions
  {
    regex: /feat:?\s+add\s+(.+)/i,
    type: "strategic",
    confidence: 0.65,
    template: "Added feature: {1}",
    category: "feature"
  },
  {
    regex: /feat:?\s+remove\s+(.+)/i,
    type: "strategic",
    confidence: 0.70,
    template: "Removed feature: {1}",
    category: "feature"
  },
  {
    regex: /feat:?\s+implement\s+(.+)/i,
    type: "strategic",
    confidence: 0.70,
    template: "Implemented: {1}",
    category: "feature"
  },

  // Abandoned approaches
  {
    regex: /revert:?\s+"(.+)"/i,
    type: "tactical",
    confidence: 0.70,
    template: "Reverted: {1} (abandoned approach)",
    category: "revert"
  },
  {
    regex: /revert\s+(.+)/i,
    type: "tactical",
    confidence: 0.65,
    template: "Reverted: {1}",
    category: "revert"
  },
  {
    regex: /rollback\s+(.+)/i,
    type: "tactical",
    confidence: 0.70,
    template: "Rolled back: {1}",
    category: "revert"
  },

  // Technology choices
  {
    regex: /adopt\s+(.+?)\s+(?:instead of|over)\s+(.+)/i,
    type: "technical",
    confidence: 0.75,
    template: "Adopted {1} over {2}",
    category: "technology"
  },
  {
    regex: /(?:use|using)\s+(.+?)\s+(?:instead of|over)\s+(.+)/i,
    type: "technical",
    confidence: 0.70,
    template: "Using {1} instead of {2}",
    category: "technology"
  },

  // Architecture decisions
  {
    regex: /arch:?\s+(.+)/i,
    type: "strategic",
    confidence: 0.75,
    template: "Architecture: {1}",
    category: "architecture"
  },
  {
    regex: /chore:?\s+setup\s+(.+)/i,
    type: "technical",
    confidence: 0.60,
    template: "Set up: {1}",
    category: "setup"
  },

  // Config/infrastructure
  {
    regex: /config:?\s+(.+)/i,
    type: "technical",
    confidence: 0.55,
    template: "Configuration: {1}",
    category: "config"
  },
  {
    regex: /deps?:?\s+(?:add|update)\s+(.+)/i,
    type: "technical",
    confidence: 0.60,
    template: "Dependency: {1}",
    category: "dependency"
  }
];

export const BRANCH_PATTERNS: BranchPattern[] = [
  {
    pattern: "deleted",
    confidence: 0.65,
    template: "Abandoned direction: {branchName}",
    category: "abandoned"
  },
  {
    pattern: "merged",
    confidence: 0.70,
    template: "Chosen approach: {branchName}",
    category: "chosen"
  }
];

export const FILE_PATTERNS = [
  {
    files: ["package.json"],
    confidence: 0.65,
    template: "Dependency decision",
    category: "dependency"
  },
  {
    files: ["tsconfig.json", "jsconfig.json"],
    confidence: 0.60,
    template: "TypeScript/JavaScript configuration",
    category: "config"
  },
  {
    files: [".gitignore", ".dockerignore"],
    confidence: 0.50,
    template: "Ignore patterns decision",
    category: "config"
  },
  {
    files: ["docker-compose.yml", "Dockerfile"],
    confidence: 0.60,
    template: "Docker/containerization decision",
    category: "infrastructure"
  }
];

/**
 * Extract template placeholders and fill them
 */
export function fillTemplate(template: string, matches: RegExpMatchArray | RegExpExecArray): string {
  return template; // Simplified - no template filling for now
}
