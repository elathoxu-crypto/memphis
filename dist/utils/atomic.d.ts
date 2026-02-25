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
export declare function atomicWriteFile(targetPath: string, data: string, mode?: number): Promise<void>;
/**

Sync version for simpler use cases

WARNING: Less crash-safe than async version
*/
export declare function atomicWriteFileSync(targetPath: string, data: string, mode?: number): void;
