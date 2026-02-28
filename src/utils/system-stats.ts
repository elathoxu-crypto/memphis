import { execSync } from "node:child_process";
import { cpus, freemem, loadavg, totalmem, uptime } from "node:os";

export interface SystemSnapshot {
  uptimeSeconds: number;
  cpuCount: number;
  memory: {
    totalMB: number;
    usedMB: number;
    freeMB: number;
  };
  loadAvg: [number, number, number];
  gitSummary?: string;
}

function roundMB(bytes: number): number {
  return Math.round(bytes / 1024 / 1024);
}

export function captureSystemSnapshot(): SystemSnapshot {
  const uptimeSeconds = uptime();
  const total = totalmem();
  const free = freemem();
  const used = total - free;

  let gitSummary: string | undefined;
  try {
    const gitStatus = execSync("git status --short 2>/dev/null | head -3", {
      encoding: "utf-8",
    }).trim();
    gitSummary = gitStatus
      ? `${gitStatus.split("\n").filter(Boolean).length}f`
      : "clean";
  } catch {
    gitSummary = undefined;
  }

  return {
    uptimeSeconds,
    cpuCount: cpus().length,
    memory: {
      totalMB: roundMB(total),
      usedMB: roundMB(used),
      freeMB: roundMB(free),
    },
    loadAvg: loadavg() as [number, number, number],
    gitSummary,
  };
}

export function formatSystemSnapshot(snapshot: SystemSnapshot): string {
  const hours = Math.floor(snapshot.uptimeSeconds / 3600);
  const minutes = Math.floor((snapshot.uptimeSeconds % 3600) / 60);
  const parts = [
    `Uptime: ${hours}h ${minutes}m`,
    `RAM: ${snapshot.memory.usedMB}MB`,
    `CPU: ${snapshot.cpuCount} cores`,
  ];

  if (snapshot.gitSummary) {
    parts.push(`Git: ${snapshot.gitSummary}`);
  }

  return parts.join(" | ");
}

export function describeSnapshot(snapshot: SystemSnapshot): string {
  const load = snapshot.loadAvg.map(n => n.toFixed(2)).join(", ");
  return `${formatSystemSnapshot(snapshot)} | Load: ${load}`;
}
