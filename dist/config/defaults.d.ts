export declare const MEMPHIS_HOME: string;
export declare const CHAINS_PATH: string;
export declare const CONFIG_PATH: string;
export declare const DEFAULT_CONFIG: {
    providers: {};
    memory: {
        path: string;
        auto_git: boolean;
        auto_git_push: boolean;
    };
    agents: {
        journal: {
            chain: string;
            context_window: number;
        };
        builder: {
            chain: string;
            context_window: number;
        };
        architect: {
            chain: string;
            context_window: number;
        };
        ops: {
            chain: string;
            context_window: number;
        };
    };
};
