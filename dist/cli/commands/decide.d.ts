export interface DecideOptions {
    /** pipe-separated list, e.g. "A|B|C" */
    options?: string;
    /** must match one of the options */
    chosen?: string;
    why?: string;
    context?: string;
    tags?: string;
    links?: string;
    confidence?: string;
    mode?: "conscious" | "inferred";
    scope?: "personal" | "project" | "life";
    status?: "active" | "revised" | "deprecated";
    decisionId?: string;
    supersedes?: string;
    evidenceRefs?: string;
    evidenceNote?: string;
}
export declare function decideCommand(title: string, opts: DecideOptions): Promise<void>;
