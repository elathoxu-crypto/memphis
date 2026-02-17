export class BaseProvider {
    isConfigured() {
        return !!this.apiKey && this.apiKey.length > 0;
    }
    async fetch(endpoint, body) {
        const response = await fetch(`${this.baseUrl}${endpoint}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${this.apiKey}`,
            },
            body: JSON.stringify(body),
        });
        if (!response.ok) {
            throw new Error(`Provider error: ${response.status} ${response.statusText}`);
        }
        return response.json();
    }
}
//# sourceMappingURL=base.js.map