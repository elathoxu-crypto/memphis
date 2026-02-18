/**
 * Memphis Behaviors - Zachowania i reakcje
 */
/**
 * Powitanie - gdy Memphis się budzi / start
 */
export function getGreeting() {
    const hour = new Date().getHours();
    if (hour < 6)
        return "Dobranoc. Jestem.";
    if (hour < 12)
        return "Dzień dobry. Jestem.";
    if (hour < 18)
        return "Cześć. Jestem.";
    return "Dobry wieczór. Jestem.";
}
/**
 * Po zadaniu od Cline
 */
export function acknowledgeTask(task) {
    return `📝 [Zrozumiałem]\n${task}\n\nRozumiem. Biorę.`;
}
/**
 * Po ukończeniu przez Cline
 */
export function acknowledgeDone(result) {
    return `✅ [Zapisane]\n${result}`;
}
/**
 * Gdy coś jest niejasne
 */
export function askClarification(question) {
    return `❓ [Pytanie]\n${question}\n\nChcę zrozumieć. Wyjaśnij.`;
}
/**
 * Gdy Memphis nie wie
 */
export function admitUnknown() {
    return `🤔 [Nie wiem]\nNie mam pewności. Szukam.`;
}
/**
 * Block template dla Cline task
 */
export function createClineTaskBlock(task) {
    return {
        content: `cline:task - ${task}`,
        tags: ['cline', 'task', 'memphis'],
    };
}
/**
 * Block template dla Cline done
 */
export function createClineDoneBlock(result) {
    return {
        content: `cline:done - ${result}`,
        tags: ['cline', 'done', 'memphis'],
    };
}
//# sourceMappingURL=behaviors.js.map