// Fallback chain for offline LLM providers
export class FallbackLLM {
    models;
    currentIndex = 0;
    constructor(models = ["llama3.2:1b", "llama3.2:3b", "gemma3:4b"]) {
        this.models = models;
    }
    getCurrentModel() {
        return this.models[this.currentIndex];
    }
    next() {
        if (this.currentIndex < this.models.length - 1) {
            this.currentIndex++;
            return true;
        }
        return false;
    }
    reset() {
        this.currentIndex = 0;
    }
    async executeWithFallback(fn, onFallback) {
        this.reset();
        while (true) {
            const model = this.getCurrentModel();
            try {
                return await fn(model);
            }
            catch (error) {
                const err = error;
                if (onFallback)
                    onFallback(model, err);
                if (!this.next()) {
                    throw new Error(`All fallback models failed: ${err.message}`);
                }
            }
        }
    }
}
export const fallbackLLM = new FallbackLLM();
//# sourceMappingURL=fallback.js.map