import { Store } from "../memory/store.js";
import { loadConfig } from "../config/loader.js";
import { log } from "../utils/logger.js";
import { verifyChain } from "../memory/chain.js";
import { execSync } from "child_process";
import { cpus, totalmem, freemem, uptime } from "os";
const DEFAULT_INTERVAL = 30 * 60 * 1000; // 30 minutes in ms
const MAX_CONTENT_LENGTH = 500;
export class AutosaveAgent {
    store;
    interval;
    chain;
    timer;
    isRunning = false;
    lastSaveTime = null;
    // Self-reflection stats
    selfStats = {
        savesCount: 0,
        totalSaveTime: 0,
        avgSaveTime: 0,
        lastSaveTime: 0,
        errorsCount: 0,
        startTime: new Date()
    };
    constructor(options = {}) {
        const config = loadConfig();
        this.store = new Store(config.memory.path);
        this.interval = options.interval ?? DEFAULT_INTERVAL;
        this.chain = options.chain ?? "journal";
    }
    start() {
        if (this.isRunning) {
            log.warn("Autosave agent is already running");
            return;
        }
        this.isRunning = true;
        this.selfStats.startTime = new Date();
        log.info(`🟢 Autosave agent started (every ${this.interval / 60000} min)`);
        this.save();
        this.timer = setInterval(() => {
            this.save();
        }, this.interval);
    }
    stop() {
        if (!this.isRunning) {
            log.warn("Autosave agent is not running");
            return;
        }
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = undefined;
        }
        this.isRunning = false;
        this.logSelfStats();
        log.info("🔴 Autosave agent stopped");
    }
    logSelfStats() {
        const { savesCount, avgSaveTime, errorsCount } = this.selfStats;
        const uptimeMs = Date.now() - this.selfStats.startTime.getTime();
        const uptimeMins = Math.floor(uptimeMs / 60000);
        console.log("📊 Self-reflection:");
        console.log(`   Saves: ${savesCount} | Avg: ${avgSaveTime.toFixed(1)}ms | Errors: ${errorsCount}`);
        console.log(`   Uptime: ${uptimeMins}m | Success rate: ${savesCount > 0 ? ((savesCount - errorsCount) / savesCount * 100).toFixed(1) : 0}%`);
    }
    getSystemStats() {
        const parts = [];
        const systemUptime = uptime();
        const hours = Math.floor(systemUptime / 3600);
        const minutes = Math.floor((systemUptime % 3600) / 60);
        parts.push(`Uptime: ${hours}h ${minutes}m`);
        const total = totalmem();
        const free = freemem();
        const used = total - free;
        const usedMB = Math.round(used / 1024 / 1024);
        parts.push(`RAM: ${usedMB}MB`);
        parts.push(`CPU: ${cpus().length} cores`);
        try {
            const gitStatus = execSync("git status --short 2>/dev/null | head -3", { encoding: "utf-8" }).trim();
            if (gitStatus) {
                const changed = gitStatus.split("\n").filter(l => l.trim()).length;
                parts.push(`Git: ${changed}f`);
            }
            else {
                parts.push("Git: clean");
            }
        }
        catch { }
        return parts.join(" | ");
    }
    getMemphisStats() {
        const blocks = this.store.readChain(this.chain);
        const { valid } = verifyChain(blocks);
        const lastBlock = blocks[blocks.length - 1];
        return {
            blocks: blocks.length,
            valid,
            lastBlock: lastBlock?.timestamp
        };
    }
    getSelfStats() {
        const { savesCount, avgSaveTime, errorsCount, startTime } = this.selfStats;
        const uptimeMs = Date.now() - startTime.getTime();
        const uptimeMins = Math.round(uptimeMs / 60000);
        const successRate = savesCount > 0 ? ((savesCount - errorsCount) / savesCount * 100).toFixed(0) : 0;
        return `Self: ${savesCount} saves | ${avgSaveTime.toFixed(0)}ms avg | ${successRate}% ok | ${uptimeMins}m uptime`;
    }
    optimizeContent(content) {
        // Self-optimization: compact content if too long
        if (content.length > MAX_CONTENT_LENGTH) {
            const lines = content.split(" | ");
            const compacted = lines.slice(0, 3).join(" | ");
            if (compacted.length < MAX_CONTENT_LENGTH) {
                return compacted + ` (+${lines.length - 3} lines)`;
            }
            return content.slice(0, MAX_CONTENT_LENGTH) + "...";
        }
        return content;
    }
    save() {
        const startTime = Date.now();
        try {
            const timestamp = new Date().toISOString();
            const memphisStats = this.getMemphisStats();
            const systemStats = this.getSystemStats();
            const selfStats = this.getSelfStats();
            const blocks = this.store.readChain(this.chain);
            const recentBlocks = blocks.slice(-2);
            const recentSummary = recentBlocks
                .map(b => `[${b.timestamp.slice(11, 16)}] ${b.data.content.slice(0, 25)}`)
                .join("; ");
            let content = [
                `Blocks: ${memphisStats.blocks} | Valid: ${memphisStats.valid}`,
                `${systemStats}`,
                `${selfStats}`,
                `Recent: ${recentSummary}`
            ].join(" | ");
            // Self-optimization: compact if needed
            content = this.optimizeContent(content);
            const block = this.store.addBlock(this.chain, {
                type: "journal",
                content,
                tags: ["autosave", "self", "system"],
                agent: "autosave",
            });
            const saveTime = Date.now() - startTime;
            this.lastSaveTime = new Date();
            // Update self-stats
            this.selfStats.savesCount++;
            this.selfStats.totalSaveTime += saveTime;
            this.selfStats.avgSaveTime = this.selfStats.totalSaveTime / this.selfStats.savesCount;
            this.selfStats.lastSaveTime = saveTime;
            log.block(this.chain, block.index, block.hash.slice(0, 8));
            log.info(`💾 ${saveTime}ms | Blocks: ${memphisStats.blocks} | Valid: ${memphisStats.valid}`);
        }
        catch (error) {
            this.selfStats.errorsCount++;
            log.error(`Autosave failed: ${error}`);
        }
    }
    status() {
        return {
            running: this.isRunning,
            lastSave: this.lastSaveTime,
            interval: this.interval,
            self: this.selfStats
        };
    }
}
let agent = null;
export function startAutosave(options) {
    if (agent) {
        agent.stop();
    }
    agent = new AutosaveAgent(options);
    agent.start();
    return agent;
}
export function stopAutosave() {
    if (agent) {
        agent.stop();
        agent = null;
    }
}
export function getAutosaveStatus() {
    if (!agent) {
        return { running: false };
    }
    return agent.status();
}
//# sourceMappingURL=autosave.js.map