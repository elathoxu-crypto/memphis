/**
 * Memphis Behaviors - Zachowania i reakcje
 */
/**
 * Powitanie - gdy Memphis się budzi / start
 */
export declare function getGreeting(): string;
/**
 * Po zadaniu od Cline
 */
export declare function acknowledgeTask(task: string): string;
/**
 * Po ukończeniu przez Cline
 */
export declare function acknowledgeDone(result: string): string;
/**
 * Gdy coś jest niejasne
 */
export declare function askClarification(question: string): string;
/**
 * Gdy Memphis nie wie
 */
export declare function admitUnknown(): string;
/**
 * Block template dla Cline task
 */
export declare function createClineTaskBlock(task: string): {
    content: string;
    tags: string[];
};
/**
 * Block template dla Cline done
 */
export declare function createClineDoneBlock(result: string): {
    content: string;
    tags: string[];
};
