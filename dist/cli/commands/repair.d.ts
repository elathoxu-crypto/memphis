export interface RepairCliOptions {
    chain?: string;
    dryRun?: boolean;
    json?: boolean;
}
export declare function repairCommand(options?: RepairCliOptions): Promise<void>;
