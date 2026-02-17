// Fallback chain for offline LLM providers

export interface FallbackConfig {
  models: string[];
  timeout: number;
}

export class FallbackLLM {
  private models: string[];
  private currentIndex = 0;
  
  constructor(models: string[] = ["llama3.2:1b", "llama3.2:3b", "gemma3:4b"]) {
    this.models = models;
  }
  
  getCurrentModel(): string {
    return this.models[this.currentIndex];
  }
  
  next(): boolean {
    if (this.currentIndex < this.models.length - 1) {
      this.currentIndex++;
      return true;
    }
    return false;
  }
  
  reset(): void {
    this.currentIndex = 0;
  }
  
  async executeWithFallback<T>(
    fn: (model: string) => Promise<T>,
    onFallback?: (model: string, error: Error) => void
  ): Promise<T> {
    this.reset();
    
    while (true) {
      const model = this.getCurrentModel();
      try {
        return await fn(model);
      } catch (error) {
        const err = error as Error;
        if (onFallback) onFallback(model, err);
        
        if (!this.next()) {
          throw new Error(`All fallback models failed: ${err.message}`);
        }
      }
    }
  }
}

export const fallbackLLM = new FallbackLLM();
