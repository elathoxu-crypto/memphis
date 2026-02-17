import { DEFAULT_CONFIG } from "./defaults.js";
export type MemphisConfig = typeof DEFAULT_CONFIG & {
    providers: Record<string, {
        url: string;
        model: string;
        api_key: string;
        role?: "primary" | "fallback" | "offline";
    }>;
};
export declare function loadConfig(): MemphisConfig;
