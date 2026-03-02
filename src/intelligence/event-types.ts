/**
 * Event Types for Event Detection System
 */

// ─────────────────────────────────────────────────────────────────────────────
// BASE EVENT INTERFACE
// ─────────────────────────────────────────────────────────────────────────────

export interface BaseEvent {
  id: string;
  timestamp: number;
  source: 'process' | 'file' | 'pattern' | 'manual';
}

// ─────────────────────────────────────────────────────────────────────────────
// PROCESS EVENTS
// ─────────────────────────────────────────────────────────────────────────────

export interface ProcessEvent extends BaseEvent {
  source: 'process';
  type: 'process-started' | 'process-finished' | 'process-failed';
  processName: string;
  pid: number;
  command?: string;
  duration?: number;  // milliseconds
  exitCode?: number;
  workingDirectory?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// FILE EVENTS
// ─────────────────────────────────────────────────────────────────────────────

export interface FileEvent extends BaseEvent {
  source: 'file';
  type: 'file-created' | 'file-modified' | 'file-deleted';
  path: string;
  extension?: string;
  linesAdded?: number;
  linesRemoved?: number;
  sizeBytes?: number;
  isConfig?: boolean;
  isGit?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// PATTERN EVENTS
// ─────────────────────────────────────────────────────────────────────────────

export interface PatternEvent extends BaseEvent {
  source: 'pattern';
  type: 'error-spike' | 'activity-burst' | 'inactivity' | 'anomaly';
  severity: 'info' | 'warning' | 'alert';
  details: string;
  data?: Record<string, any>;
}

// ─────────────────────────────────────────────────────────────────────────────
// MANUAL EVENTS
// ─────────────────────────────────────────────────────────────────────────────

export interface ManualEvent extends BaseEvent {
  source: 'manual';
  type: 'user-triggered';
  message: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// UNION TYPE
// ─────────────────────────────────────────────────────────────────────────────

export type MemphisEvent = ProcessEvent | FileEvent | PatternEvent | ManualEvent;

// ─────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────

export interface EventDetectionConfig {
  enabled: boolean;
  
  processes: {
    minDuration: number;        // ms, default: 300000 (5 min)
    trackNames: string[];       // process names to track
    ignoreNames: string[];      // process names to ignore
  };
  
  files: {
    significantChangeLines: number;  // default: 100
    watchPaths: string[];
    ignorePaths: string[];
    debounceMs: number;              // default: 2000
  };
  
  patterns: {
    errorSpikeThreshold: number;     // default: 3
    errorSpikeWindow: number;        // ms, default: 600000 (10 min)
    activityBurstThreshold: number;  // default: 10
    activityBurstWindow: number;     // ms, default: 300000 (5 min)
  };
  
  persistence: {
    enabled: boolean;
    maxEvents: number;               // default: 1000
    maxAge: number;                  // ms, default: 86400000 (24h)
  };
}

export const DEFAULT_EVENT_CONFIG: EventDetectionConfig = {
  enabled: true,
  
  processes: {
    minDuration: 300000,  // 5 min
    trackNames: ['node', 'npm', 'yarn', 'pnpm', 'git', 'docker', 'python', 'cargo'],
    ignoreNames: ['sh', 'bash', 'zsh', 'fish']
  },
  
  files: {
    significantChangeLines: 100,
    watchPaths: [],
    ignorePaths: ['node_modules', '.git', 'dist', 'build'],
    debounceMs: 2000
  },
  
  patterns: {
    errorSpikeThreshold: 3,
    errorSpikeWindow: 600000,      // 10 min
    activityBurstThreshold: 10,
    activityBurstWindow: 300000   // 5 min
  },
  
  persistence: {
    enabled: true,
    maxEvents: 1000,
    maxAge: 86400000  // 24h
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// EVENT BUFFER
// ─────────────────────────────────────────────────────────────────────────────

export interface EventBuffer {
  events: MemphisEvent[];
  lastCleanup: number;
}
