interface AutosaveOptions {
    interval?: number;
    chain?: string;
}
interface SelfStats {
    savesCount: number;
    totalSaveTime: number;
    avgSaveTime: number;
    lastSaveTime: number;
    errorsCount: number;
    startTime: Date;
}
export declare class AutosaveAgent {
    private store;
    private interval;
    private chain;
    private timer?;
    private isRunning;
    private lastSaveTime;
    private selfStats;
    constructor(options?: AutosaveOptions);
    start(): void;
    stop(): void;
    private logSelfStats;
    private getSystemStats;
    private getMemphisStats;
    private getSelfStats;
    private optimizeContent;
    private save;
    status(): {
        running: boolean;
        lastSave: Date | null;
        interval: number;
        self: SelfStats;
    };
}
export declare function startAutosave(options?: AutosaveOptions): AutosaveAgent;
export declare function stopAutosave(): void;
export declare function getAutosaveStatus(): {
    running: boolean;
    lastSave: Date | null;
    interval: number;
    self: SelfStats;
} | {
    running: boolean;
};
export {};
