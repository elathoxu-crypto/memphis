interface VaultOptions {
    action: "add" | "list" | "get" | "delete" | "init";
    key?: string;
    value?: string;
    password?: string;
}
export declare function vaultCommand(opts: VaultOptions): Promise<void>;
export {};
