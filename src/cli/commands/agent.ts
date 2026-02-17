import { startAutosave, stopAutosave, getAutosaveStatus } from "../../agents/autosave.js";
import { log } from "../../utils/logger.js";

export async function agentCommand(action: string, options: { interval?: string }) {
  let intervalMs: number | undefined;
  if (options.interval) {
    const match = options.interval.match(/^(\d+)(s|m|h)$/);
    if (match) {
      const value = parseInt(match[1]);
      const unit = match[2];
      if (unit === "s") intervalMs = value * 1000;
      else if (unit === "m") intervalMs = value * 60 * 1000;
      else if (unit === "h") intervalMs = value * 60 * 60 * 1000;
    }
  }

  if (action === "start") {
    startAutosave(intervalMs ? { interval: intervalMs } : undefined);
    log.success("Autosave agent started");
  } else if (action === "stop") {
    stopAutosave();
    log.success("Autosave agent stopped");
  } else if (action === "status") {
    const status = getAutosaveStatus();
    if (status.running && 'interval' in status) {
      console.log("🟢 Autosave agent is RUNNING");
      console.log(`   Interval: ${(status.interval / 60000).toFixed(1)} minutes`);
      console.log(`   Last save: ${status.lastSave}`);
      
      // Self-reflection stats
      if ('self' in status && status.self) {
        const s = status.self;
        const uptimeMs = Date.now() - s.startTime.getTime();
        const uptimeMins = Math.floor(uptimeMs / 60000);
        const successRate = s.savesCount > 0 ? ((s.savesCount - s.errorsCount) / s.savesCount * 100).toFixed(0) : 0;
        
        console.log("");
        console.log("📊 Self-reflection:");
        console.log(`   Saves: ${s.savesCount} | Avg: ${s.avgSaveTime.toFixed(0)}ms | Errors: ${s.errorsCount}`);
        console.log(`   Uptime: ${uptimeMins}m | Success: ${successRate}%`);
      }
    } else {
      console.log("🔴 Autosave agent is NOT running");
    }
  } else {
    log.error(`Unknown action: ${action}`);
    console.log("Usage: memphis agent <start|stop|status> [--interval <time>]");
  }
}
