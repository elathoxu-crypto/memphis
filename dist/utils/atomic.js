import { mkdirSync, writeFileSync, openSync, fsyncSync, closeSync, renameSync } from "node:fs";
import { dirname, join } from "node:path";
import { randomUUID } from "node:crypto";
/**

Atomic file write - crash-safe, power-loss resistant

Flow:
1. Write to temp file in same directory
2. Sync to disk (fsync)
3. Atomic rename to final name

Why same directory:
- rename() is atomic only on same filesystem
- Same dir = same filesystem = atomic

Why "wx" flag:
- Fail if temp file exists (safer)
- Prevents race conditions
*/
export async function atomicWriteFile(targetPath, data, mode = 0o644) {
    // Ensure directory exists
    const dir = dirname(targetPath);
    mkdirSync(dir, { recursive: true, mode: 0o700 });
    // Create temp file in same directory
    const tmpPath = join(dir, `.${randomUUID()}.tmp`);
    try {
        // Write with exclusive flag (fail if exists)
        const fd = openSync(tmpPath, "wx", mode);
        try {
            // Write data
            writeFileSync(fd, data, { encoding: "utf-8" });
            // Sync to disk (protect against power loss)
            fsyncSync(fd);
        }
        finally {
            closeSync(fd);
        }
        // Atomic rename (same filesystem = guaranteed atomic)
        renameSync(tmpPath, targetPath);
    }
    catch (error) {
        // Cleanup temp file on failure
        try {
            const { unlinkSync } = await import("node:fs");
            unlinkSync(tmpPath);
        }
        catch {
            // Ignore cleanup errors
        }
        throw error;
    }
}
/**

Sync version for simpler use cases

WARNING: Less crash-safe than async version
*/
export function atomicWriteFileSync(targetPath, data, mode = 0o644) {
    const dir = dirname(targetPath);
    mkdirSync(dir, { recursive: true, mode: 0o700 });
    const tmpPath = join(dir, `.${randomUUID()}.tmp`);
    try {
        writeFileSync(tmpPath, data, { encoding: "utf-8" });
        const fd = openSync(tmpPath, "r+");
        fsyncSync(fd);
        closeSync(fd);
        renameSync(tmpPath, targetPath);
    }
    catch (error) {
        try {
            const { unlinkSync } = require("node:fs");
            unlinkSync(tmpPath);
        }
        catch {
            // Ignore
        }
        throw error;
    }
}
//# sourceMappingURL=atomic.js.map