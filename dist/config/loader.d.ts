import { z } from "zod";
import { DEFAULT_CONFIG } from "./defaults.js";
declare const MemphisConfigSchema: z.ZodObject<{
    providers: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodObject<{
        url: z.ZodOptional<z.ZodString>;
        model: z.ZodOptional<z.ZodString>;
        api_key: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodEnum<{
            primary: "primary";
            fallback: "fallback";
            offline: "offline";
        }>>;
    }, z.core.$strip>>>;
    memory: z.ZodOptional<z.ZodObject<{
        path: z.ZodOptional<z.ZodString>;
        auto_git: z.ZodOptional<z.ZodBoolean>;
        auto_git_push: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strip>>;
    agents: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodObject<{
        chain: z.ZodOptional<z.ZodString>;
        context_window: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strip>>>;
}, z.core.$strip>;
export type MemphisConfig = z.infer<typeof MemphisConfigSchema> & typeof DEFAULT_CONFIG;
export declare class ConfigError extends Error {
    readonly issues?: z.ZodIssue[] | undefined;
    constructor(message: string, issues?: z.ZodIssue[] | undefined);
}
export declare function loadConfig(): MemphisConfig;
export {};
