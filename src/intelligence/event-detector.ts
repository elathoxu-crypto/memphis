/**
 * Event Detection Engine
 *
 * Detects significant events (process, file, pattern) and generates suggestions
 */

import { EventEmitter } from 'node:events';
import { watch as fsWatch, existsSync } from 'node:fs';
import { readFile, writeFile, appendFile } from 'node:fs/promises';
import path from 'node:path';
import { MEMPHIS_HOME } from '../config/defaults.js';
import {
  type MemphisEvent,
  type ProcessEvent,
  type FileEvent,
  type PatternEvent,
  type EventDetectionConfig,
  type EventBuffer,
  DEFAULT_EVENT_CONFIG
} from './event-types.js';
import { type Suggestion, checkTimeTriggers } from './suggestions.js';

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const EVENTS_FILE = path.join(MEMPHIS_HOME, 'intelligence', 'events.jsonl');
const BUFFER_FILE = path.join(MEMPHIS_HOME, 'intelligence', 'event-buffer.json');

// ─────────────────────────────────────────────────────────────────────────────
// EVENT DETECTOR CLASS
// ─────────────────────────────────────────────────────────────────────────────

export class EventDetector extends EventEmitter {
  private config: EventDetectionConfig;
  private buffer: EventBuffer;
  private activeProcesses: Map<number, ProcessEvent> = new Map();
  private fileWatchers: Map<string, any> = new Map();
  private isRunning: boolean = false;
  private cleanupInterval?: NodeJS.Timeout;

  constructor(config: Partial<EventDetectionConfig> = {}) {
    super();
    this.config = { ...DEFAULT_EVENT_CONFIG, ...config };
    this.buffer = { events: [], lastCleanup: Date.now() };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // LIFECYCLE
  // ───────────────────────────────────────────────────────────────────────────

  async start(): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;

    // Load existing buffer
    await this.loadBuffer();

    // Start process monitoring (simulated - would use ps/watch in production)
    this.startProcessMonitoring();

    // Start cleanup interval
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60000); // Every minute

    this.emit('started');
  }

  async stop(): Promise<void> {
    if (!this.isRunning) return;
    this.isRunning = false;

    // Stop file watchers
    for (const [path, watcher] of this.fileWatchers) {
      watcher.close();
    }
    this.fileWatchers.clear();

    // Stop cleanup
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    // Save buffer
    await this.saveBuffer();

    this.emit('stopped');
  }

  // ───────────────────────────────────────────────────────────────────────────
  // PROCESS MONITORING
  // ───────────────────────────────────────────────────────────────────────────

  private startProcessMonitoring(): void {
    // Note: Full process monitoring would require platform-specific code
    // (ps on Unix, WMI on Windows) or a library like `ps-node`
    // This is a simplified version that tracks manually reported processes
    
    // For now, we'll provide methods to manually report process events
    // In production, this would integrate with the system process monitor
  }

  /**
   * Report a process started
   */
  reportProcessStarted(
    processName: string,
    pid: number,
    command?: string,
    workingDirectory?: string
  ): void {
    if (!this.shouldTrackProcess(processName)) return;

    const event: ProcessEvent = {
      id: `proc-${Date.now()}-${pid}`,
      timestamp: Date.now(),
      source: 'process',
      type: 'process-started',
      processName,
      pid,
      command,
      workingDirectory
    };

    this.activeProcesses.set(pid, event);
    this.addEvent(event);
  }

  /**
   * Report a process finished
   */
  reportProcessFinished(pid: number, exitCode: number = 0): void {
    const startEvent = this.activeProcesses.get(pid);
    if (!startEvent) return;

    const duration = Date.now() - startEvent.timestamp;
    
    // Only generate event if process ran long enough
    if (duration < this.config.processes.minDuration) {
      this.activeProcesses.delete(pid);
      return;
    }

    const event: ProcessEvent = {
      id: `proc-${Date.now()}-${pid}`,
      timestamp: Date.now(),
      source: 'process',
      type: exitCode === 0 ? 'process-finished' : 'process-failed',
      processName: startEvent.processName,
      pid,
      command: startEvent.command,
      duration,
      exitCode
    };

    this.activeProcesses.delete(pid);
    this.addEvent(event);
  }

  private shouldTrackProcess(name: string): boolean {
    const lower = name.toLowerCase();
    
    // Check ignore list first
    if (this.config.processes.ignoreNames.some(n => lower.includes(n.toLowerCase()))) {
      return false;
    }

    // Check track list
    return this.config.processes.trackNames.some(n => lower.includes(n.toLowerCase()));
  }

  // ───────────────────────────────────────────────────────────────────────────
  // FILE MONITORING
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Watch a directory for file changes
   */
  watchPath(targetPath: string): void {
    if (this.fileWatchers.has(targetPath)) return;

    try {
      const watcher = fsWatch(targetPath, { recursive: true }, (eventType, filename) => {
        if (!filename) return;
        
        const fullPath = path.join(targetPath, filename.toString());
        
        // Debounce and filter
        this.handleFileEvent(eventType, fullPath);
      });

      this.fileWatchers.set(targetPath, watcher);
    } catch (error) {
      this.emit('error', error);
    }
  }

  private handleFileEvent(eventType: string, filePath: string): void {
    // Ignore certain paths
    if (this.shouldIgnorePath(filePath)) return;

    // Determine event type
    let type: 'file-created' | 'file-modified' | 'file-deleted';
    if (eventType === 'rename') {
      type = existsSync(filePath) ? 'file-created' : 'file-deleted';
    } else {
      type = 'file-modified';
    }

    const event: FileEvent = {
      id: `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      source: 'file',
      type,
      path: filePath,
      extension: path.extname(filePath),
      isConfig: this.isConfigFile(filePath),
      isGit: filePath.includes('.git')
    };

    this.addEvent(event);
  }

  private shouldIgnorePath(filePath: string): boolean {
    return this.config.files.ignorePaths.some(ignore => 
      filePath.includes(ignore)
    );
  }

  private isConfigFile(filePath: string): boolean {
    const configPatterns = [
      'config.',
      '.config/',
      'settings.',
      '.env',
      'package.json',
      'tsconfig.json'
    ];
    return configPatterns.some(p => filePath.includes(p));
  }

  // ───────────────────────────────────────────────────────────────────────────
  // PATTERN DETECTION
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Detect patterns in recent events
   */
  detectPatterns(): PatternEvent[] {
    const patterns: PatternEvent[] = [];
    const now = Date.now();
    const recentEvents = this.buffer.events.filter(
      e => now - e.timestamp < this.config.patterns.errorSpikeWindow
    );

    // Error spike detection
    const errors = recentEvents.filter(
      e => e.source === 'process' && (e as ProcessEvent).exitCode !== 0
    );
    
    if (errors.length >= this.config.patterns.errorSpikeThreshold) {
      patterns.push({
        id: `pattern-${Date.now()}-error-spike`,
        timestamp: now,
        source: 'pattern',
        type: 'error-spike',
        severity: 'warning',
        details: `${errors.length} process failures in last ${Math.floor(this.config.patterns.errorSpikeWindow / 60000)} minutes`,
        data: { errorCount: errors.length }
      });
    }

    // Activity burst detection
    const activityWindow = now - this.config.patterns.activityBurstWindow;
    const recentActivity = this.buffer.events.filter(
      e => e.timestamp > activityWindow
    );

    if (recentActivity.length >= this.config.patterns.activityBurstThreshold) {
      patterns.push({
        id: `pattern-${Date.now()}-activity-burst`,
        timestamp: now,
        source: 'pattern',
        type: 'activity-burst',
        severity: 'info',
        details: `High activity: ${recentActivity.length} events in last ${Math.floor(this.config.patterns.activityBurstWindow / 60000)} minutes`,
        data: { eventCount: recentActivity.length }
      });
    }

    // Add pattern events to buffer
    patterns.forEach(p => this.addEvent(p));

    return patterns;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // EVENT MANAGEMENT
  // ───────────────────────────────────────────────────────────────────────────

  private addEvent(event: MemphisEvent): void {
    this.buffer.events.push(event);
    this.emit('event', event);

    // Persist to file
    if (this.config.persistence.enabled) {
      this.persistEvent(event);
    }

    // Check buffer size
    if (this.buffer.events.length > this.config.persistence.maxEvents) {
      this.cleanup();
    }
  }

  private async persistEvent(event: MemphisEvent): Promise<void> {
    try {
      await appendFile(EVENTS_FILE, JSON.stringify(event) + '\n', 'utf8');
    } catch (error) {
      // Ignore persistence errors
    }
  }

  private async loadBuffer(): Promise<void> {
    try {
      const data = await readFile(BUFFER_FILE, 'utf8');
      this.buffer = JSON.parse(data);
    } catch {
      this.buffer = { events: [], lastCleanup: Date.now() };
    }
  }

  private async saveBuffer(): Promise<void> {
    try {
      const { writeFile: write } = await import('node:fs/promises');
      await write(BUFFER_FILE, JSON.stringify(this.buffer, null, 2), 'utf8');
    } catch {
      // Ignore save errors
    }
  }

  private cleanup(): void {
    const now = Date.now();
    const cutoff = now - this.config.persistence.maxAge;
    
    this.buffer.events = this.buffer.events.filter(e => e.timestamp > cutoff);
    this.buffer.lastCleanup = now;
    
    this.saveBuffer();
  }

  // ───────────────────────────────────────────────────────────────────────────
  // PUBLIC API
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Get recent events
   */
  getRecentEvents(limit: number = 50): MemphisEvent[] {
    return this.buffer.events.slice(-limit);
  }

  /**
   * Get events of a specific type
   */
  getEventsByType(type: MemphisEvent['source']): MemphisEvent[] {
    return this.buffer.events.filter(e => e.source === type);
  }

  /**
   * Clear all events
   */
  clearEvents(): void {
    this.buffer.events = [];
    this.saveBuffer();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// EVENT → SUGGESTION MAPPER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Map events to suggestions
 */
export function mapEventToSuggestion(event: MemphisEvent): Suggestion | null {
  // Process events
  if (event.source === 'process') {
    const proc = event as ProcessEvent;
    
    if (proc.type === 'process-finished' && proc.duration && proc.duration > 300000) {
      return {
        type: 'journal',
        message: `Task "${proc.processName}" completed (${Math.floor(proc.duration / 60000)}min). What did you learn?`,
        priority: 'medium',
        trigger: 'process-finished',
        timestamp: event.timestamp
      };
    }
    
    if (proc.type === 'process-failed') {
      return {
        type: 'journal',
        message: `Process "${proc.processName}" failed. Debug notes?`,
        priority: 'high',
        trigger: 'process-failed',
        timestamp: event.timestamp
      };
    }
  }

  // File events
  if (event.source === 'file') {
    const file = event as FileEvent;
    
    if (file.isConfig && file.type === 'file-modified') {
      return {
        type: 'journal',
        message: `Config updated (${path.basename(file.path)}). Record why?`,
        priority: 'medium',
        trigger: 'config-changed',
        timestamp: event.timestamp
      };
    }
    
    if ((file.linesAdded || 0) > 100 || (file.linesRemoved || 0) > 100) {
      return {
        type: 'journal',
        message: `Big changes in ${path.basename(file.path)}. Document them?`,
        priority: 'low',
        trigger: 'large-file-change',
        timestamp: event.timestamp
      };
    }
  }

  // Pattern events
  if (event.source === 'pattern') {
    const pattern = event as PatternEvent;
    
    if (pattern.type === 'error-spike') {
      return {
        type: 'journal',
        message: `Multiple errors detected. Root cause?`,
        priority: 'high',
        trigger: 'error-spike',
        timestamp: event.timestamp
      };
    }
    
    if (pattern.type === 'activity-burst') {
      return {
        type: 'journal',
        message: `Busy period! Capture your work?`,
        priority: 'low',
        trigger: 'activity-burst',
        timestamp: event.timestamp
      };
    }
  }

  return null;
}

/**
 * Check event-based triggers (combined with time-based)
 */
export function checkEventTriggers(events: MemphisEvent[]): Suggestion[] {
  const suggestions: Suggestion[] = [];
  const seen = new Set<string>();

  for (const event of events) {
    const suggestion = mapEventToSuggestion(event);
    if (suggestion && !seen.has(suggestion.trigger)) {
      suggestions.push(suggestion);
      seen.add(suggestion.trigger);
    }
  }

  return suggestions;
}

// ─────────────────────────────────────────────────────────────────────────────
// SINGLETON INSTANCE
// ─────────────────────────────────────────────────────────────────────────────

let detectorInstance: EventDetector | null = null;

export function getEventDetector(config?: Partial<EventDetectionConfig>): EventDetector {
  if (!detectorInstance) {
    detectorInstance = new EventDetector(config);
  }
  return detectorInstance;
}
