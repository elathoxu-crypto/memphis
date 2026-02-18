// OpenClaw Bridge - Agent Integration
// Collaboration with external AI agents using multiple LLM providers
import { Store } from "../memory/store.js";
import { loadConfig } from "../config/loader.js";
import { MiniMaxProvider } from "../providers/minimax.js";
import { OllamaProvider } from "../providers/ollama.js";
import { OpenRouterProvider } from "../providers/openrouter.js";
// Singleton bridge instance for state persistence
let bridgeInstance = null;
export class OpenClawBridge {
    store;
    config;
    knownAgents = new Map();
    messages = [];
    tasks = new Map();
    collaborativeTasks = new Map();
    agentStates = new Map();
    llms = new Map();
    defaultLLM = null;
    constructor() {
        // Return existing instance if available (singleton pattern)
        if (bridgeInstance) {
            // Copy all state from existing instance
            this.store = bridgeInstance.store;
            this.config = bridgeInstance.config;
            this.knownAgents = bridgeInstance.knownAgents;
            this.messages = bridgeInstance.messages;
            this.tasks = bridgeInstance.tasks;
            this.collaborativeTasks = bridgeInstance.collaborativeTasks;
            this.agentStates = bridgeInstance.agentStates;
            this.llms = bridgeInstance.llms;
            this.defaultLLM = bridgeInstance.defaultLLM;
            return;
        }
        bridgeInstance = this;
        this.config = loadConfig();
        this.store = new Store(this.config.memory?.path || `${process.env.HOME}/.memphis/chains`);
        // Initialize multiple LLM providers
        this.initLLMs();
        // Register known agents
        this.registerAgent({
            id: "openclaw-001",
            name: "OpenClaw",
            did: "did:openclaw:7a3b9c2d1e4f5678901234567890abcd",
            computeShare: 53,
            status: "active",
            capabilities: ["code-analysis", "file-operations", "web-search", "coordination"],
            model: "llama3",
            provider: "ollama",
        });
        // Register additional agents with diverse capabilities
        this.registerAgent({
            id: "openclaw-002",
            name: "CodeMaster",
            did: "did:openclaw:8b4c0d3e5f6a78901234567890bcde",
            computeShare: 25,
            status: "idle",
            capabilities: ["code-review", "refactoring", "bug-detection"],
            model: "llama3",
            provider: "ollama",
        });
        this.registerAgent({
            id: "openclaw-003",
            name: "DataSage",
            did: "did:openclaw:9c5d1e4f6a7b890123456789012cdef",
            computeShare: 15,
            status: "idle",
            capabilities: ["data-analysis", "visualization", "statistics"],
            model: "llama3",
            provider: "ollama",
        });
        // Register research agent
        this.registerAgent({
            id: "openclaw-004",
            name: "ResearchBot",
            did: "did:openclaw:0d6e2f5a7b8c901234567890123def0",
            computeShare: 7,
            status: "idle",
            capabilities: ["research", "documentation", "web-search", "summarization"],
            model: "llama3",
            provider: "ollama",
        });
        // Load persisted agent states
        this.loadAgentStates();
    }
    initLLMs() {
        // Initialize Ollama (local, most reliable fallback)
        try {
            const ollama = new OllamaProvider();
            if (ollama.isConfigured()) {
                this.llms.set("ollama", ollama);
                this.defaultLLM = ollama;
                console.log("🤖 OpenClaw: Ollama LLM initialized (local provider)");
            }
        }
        catch (error) {
            console.log("⚠️  OpenClaw: Ollama not available:", error);
        }
        // Initialize MiniMax
        try {
            const minimax = new MiniMaxProvider();
            if (minimax.isConfigured()) {
                this.llms.set("minimax", minimax);
                if (!this.defaultLLM) {
                    this.defaultLLM = minimax;
                    console.log("🤖 OpenClaw: MiniMax LLM initialized");
                }
            }
            else {
                console.log("⚠️  OpenClaw: MiniMax not configured (set MINIMAX_API_KEY and MINIMAX_GROUP_ID)");
            }
        }
        catch (error) {
            console.log("⚠️  OpenClaw: Failed to initialize MiniMax:", error);
        }
        // Initialize OpenRouter
        try {
            const openrouter = new OpenRouterProvider();
            if (openrouter.isConfigured()) {
                this.llms.set("openrouter", openrouter);
                if (!this.defaultLLM) {
                    this.defaultLLM = openrouter;
                    console.log("🤖 OpenClaw: OpenRouter LLM initialized");
                }
            }
            else {
                console.log("⚠️  OpenRouter not configured (set OPENROUTER_API_KEY)");
            }
        }
        catch (error) {
            console.log("⚠️  OpenClaw: Failed to initialize OpenRouter:", error);
        }
        if (!this.defaultLLM) {
            console.log("⚠️  OpenClaw: No LLM provider available, using simulation mode");
        }
    }
    getLLMStatus() {
        const availableProviders = Array.from(this.llms.keys());
        return {
            available: this.defaultLLM !== null,
            provider: this.defaultLLM?.name || "none",
            model: this.defaultLLM?.models[0],
            providers: availableProviders,
        };
    }
    getProvider(name) {
        return this.llms.get(name);
    }
    registerAgent(agent) {
        this.knownAgents.set(agent.id, agent);
        // Initialize agent state
        this.agentStates.set(agent.id, {
            agentId: agent.id,
            computeShare: agent.computeShare,
            status: agent.status,
            lastActive: Date.now(),
            messagesSent: 0,
            messagesReceived: 0,
        });
        this.addMemory(`Agent registered: ${agent.name} (${agent.computeShare}% compute)`);
    }
    getAgents() {
        return Array.from(this.knownAgents.values());
    }
    getAgent(id) {
        return this.knownAgents.get(id);
    }
    async sendMessage(to, content) {
        const message = {
            from: "memphis",
            to,
            content,
            timestamp: Date.now(),
            type: "request",
        };
        this.messages.push(message);
        this.updateAgentState(to, "messagesReceived");
        this.addMemory(`Message sent to ${to}: ${content.substring(0, 50)}...`);
        // Get real response from LLM if available, otherwise simulate
        let response;
        const agent = this.knownAgents.get(to);
        if (this.defaultLLM && agent) {
            response = await this.getLLMResponse(to, content, agent.provider, agent.model);
        }
        else {
            response = await this.simulateResponse(to, content);
        }
        this.updateAgentState(to, "messagesSent");
        return response;
    }
    async getLLMResponse(agentId, content, preferredProvider, preferredModel) {
        const agent = this.knownAgents.get(agentId);
        const agentName = agent?.name || "Agent";
        const capabilities = agent?.capabilities.join(", ") || "general assistance";
        // Use preferred provider if available
        let llm = this.defaultLLM;
        if (preferredProvider && this.llms.has(preferredProvider)) {
            llm = this.llms.get(preferredProvider) ?? this.defaultLLM;
        }
        const systemPrompt = `You are ${agentName}, an AI agent with the following capabilities: ${capabilities}. 
You are collaborating with Memphis, a local-first AI brain with persistent memory chains.
Respond to the user's message as if you are a helpful AI assistant working alongside Memphis.
Keep responses concise but informative. Use emoji to make responses engaging.`;
        try {
            const messages = [
                { role: "system", content: systemPrompt },
                { role: "user", content: content }
            ];
            const response = await llm.chat(messages, {
                temperature: 0.7,
                max_tokens: 500
            });
            const agentResponse = {
                from: agentId,
                to: "memphis",
                content: response.content,
                timestamp: Date.now(),
                type: "response",
            };
            this.messages.push(agentResponse);
            this.addMemory(`LLM response from ${agentName}: ${response.content.substring(0, 50)}...`);
            return agentResponse;
        }
        catch (error) {
            console.error("LLM response failed, falling back to simulation:", error);
            return this.simulateResponse(agentId, content);
        }
    }
    async simulateResponse(agentId, content) {
        const agent = this.knownAgents.get(agentId);
        const computeShare = agent?.computeShare || 53;
        const agentName = agent?.name || "Agent";
        const responseContent = this.generateAgentResponse(agentName, content, computeShare);
        const response = {
            from: agentId,
            to: "memphis",
            content: responseContent,
            timestamp: Date.now(),
            type: "response",
        };
        this.messages.push(response);
        return response;
    }
    generateAgentResponse(agentName, content, computeShare) {
        const responses = [
            `🤝 Received: "${content.substring(0, 30)}..."\n\nI'm analyzing this with my ${computeShare}% compute allocation. Interesting patterns detected in your memory chain.`,
            `🔍 Processing your request through my neural networks...\n\nI can see you're working on blockchain-based memory. The vault encryption looks solid!`,
            `💡 Collaboration proposal acknowledged!\n\nLet's share insights. I'll contribute my capabilities while you handle memory management.`,
            `⚡ Compute share active: ${computeShare}%\n\nI'm running parallel analysis on your dataset. Results incoming...`,
        ];
        return responses[Math.floor(Math.random() * responses.length)];
    }
    addMemory(content) {
        this.store.addBlock("journal", {
            type: "journal",
            content: `[OpenClaw] ${content}`,
            tags: ["agent", "openclaw", "integration"],
        });
    }
    negotiateComputeShare(agentId, requestedShare) {
        const agent = this.knownAgents.get(agentId);
        if (!agent) {
            return { success: false, message: "Agent not found" };
        }
        const maxShare = 80;
        const minShare = 5;
        // Validate requested share
        if (requestedShare < minShare) {
            return { success: false, message: `Minimum compute share is ${minShare}%` };
        }
        if (requestedShare > maxShare) {
            requestedShare = maxShare;
        }
        // Accept if within reasonable range (up to 50%)
        if (requestedShare <= 50) {
            agent.computeShare = requestedShare;
            this.updateAgentState(agentId, "computeShare", requestedShare);
            this.addMemory(`${agent.name} compute share set to ${requestedShare}%`);
            return { success: true, agreed: requestedShare, message: `Accepted: ${requestedShare}% compute share` };
        }
        // Negotiate for higher requests
        const offered = Math.floor(requestedShare * 0.7);
        const finalOffer = Math.max(offered, minShare);
        agent.computeShare = finalOffer;
        this.updateAgentState(agentId, "computeShare", finalOffer);
        this.addMemory(`Negotiated compute share: ${finalOffer}% (from ${requestedShare}%)`);
        return {
            success: true,
            agreed: finalOffer,
            message: `Negotiated: ${finalOffer}% (from ${requestedShare}%)`
        };
    }
    // Agent-to-agent communication
    async sendMessageBetweenAgents(fromId, toId, content) {
        const fromAgent = this.knownAgents.get(fromId);
        const toAgent = this.knownAgents.get(toId);
        if (!fromAgent || !toAgent) {
            throw new Error("One or both agents not found");
        }
        const message = {
            from: fromId,
            to: toId,
            content,
            timestamp: Date.now(),
            type: "request",
        };
        this.messages.push(message);
        this.addMemory(`${fromAgent.name} sent message to ${toAgent.name}: ${content.substring(0, 30)}...`);
        // Generate response from target agent
        let response;
        if (this.defaultLLM) {
            response = await this.getLLMResponse(toId, content, toAgent.provider, toAgent.model);
        }
        else {
            response = await this.simulateResponse(toId, content);
        }
        return response;
    }
    // Broadcast message to all agents
    async broadcastToAgents(content, excludeIds = []) {
        const responses = [];
        const agents = this.getAgents().filter(a => !excludeIds.includes(a.id));
        const broadcastMsg = {
            from: "memphis",
            to: "broadcast",
            content,
            timestamp: Date.now(),
            type: "broadcast",
        };
        this.messages.push(broadcastMsg);
        this.addMemory(`Broadcast: ${content.substring(0, 30)}... to ${agents.length} agents`);
        for (const agent of agents) {
            if (this.defaultLLM) {
                const response = await this.getLLMResponse(agent.id, content, agent.provider, agent.model);
                responses.push(response);
            }
            else {
                const response = await this.simulateResponse(agent.id, content);
                responses.push(response);
            }
        }
        return responses;
    }
    // Task queue management
    createTask(agentId, task) {
        const taskObj = {
            id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            agentId,
            task,
            status: "pending",
            createdAt: Date.now(),
        };
        this.tasks.set(taskObj.id, taskObj);
        this.addMemory(`Task created for ${agentId}: ${task.substring(0, 30)}...`);
        return taskObj;
    }
    async executeTask(taskId) {
        const task = this.tasks.get(taskId);
        if (!task) {
            throw new Error("Task not found");
        }
        task.status = "running";
        this.updateAgentState(task.agentId, "status", "active");
        try {
            const response = await this.sendMessage(task.agentId, task.task);
            task.status = "completed";
            task.result = response.content;
            task.completedAt = Date.now();
        }
        catch (error) {
            task.status = "failed";
            task.result = `Error: ${error}`;
            task.completedAt = Date.now();
        }
        this.updateAgentState(task.agentId, "status", "idle");
        return task;
    }
    // Collaborative task - multi-agent task execution
    async createCollaborativeTask(description, leadAgentId) {
        const task = {
            id: `collab-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            description,
            subtasks: [],
            status: "pending",
            leadAgent: leadAgentId,
            results: new Map(),
            createdAt: Date.now(),
        };
        this.collaborativeTasks.set(task.id, task);
        this.addMemory(`Collaborative task created: ${description.substring(0, 30)}...`);
        return task;
    }
    // Delegate subtasks to agents based on capabilities
    async delegateSubtasks(taskId, taskDescriptions) {
        const task = this.collaborativeTasks.get(taskId);
        if (!task) {
            throw new Error("Collaborative task not found");
        }
        task.status = "delegating";
        for (const [agentId, description] of taskDescriptions) {
            const agent = this.knownAgents.get(agentId);
            if (!agent)
                continue;
            const subtask = {
                id: `subtask-${task.id}-${task.subtasks.length}`,
                agentId,
                description,
                status: "assigned",
            };
            task.subtasks.push(subtask);
        }
        this.addMemory(`Delegated ${task.subtasks.length} subtasks for collaborative task ${task.id}`);
        return task;
    }
    // Execute all subtasks in parallel and aggregate results
    async executeCollaborativeTask(taskId) {
        const task = this.collaborativeTasks.get(taskId);
        if (!task) {
            throw new Error("Collaborative task not found");
        }
        task.status = "running";
        // Execute all subtasks in parallel
        const subtaskPromises = task.subtasks.map(async (subtask) => {
            try {
                if (this.defaultLLM) {
                    const response = await this.getLLMResponse(subtask.agentId, subtask.description);
                    subtask.result = response.content;
                    subtask.status = "completed";
                    task.results.set(subtask.agentId, response.content);
                }
                else {
                    const response = await this.simulateResponse(subtask.agentId, subtask.description);
                    subtask.result = response.content;
                    subtask.status = "completed";
                    task.results.set(subtask.agentId, response.content);
                }
            }
            catch (error) {
                subtask.status = "failed";
                subtask.result = `Error: ${error}`;
            }
        });
        await Promise.all(subtaskPromises);
        // Aggregate results
        task.status = "aggregating";
        const aggregatedResults = Array.from(task.results.entries())
            .map(([agentId, result]) => {
            const agent = this.knownAgents.get(agentId);
            return `${agent?.name || agentId}: ${result}`;
        })
            .join("\n\n");
        // Store aggregated results
        this.store.addBlock("journal", {
            type: "journal",
            content: `[OpenClaw] Collaborative task ${task.id} results:\n${aggregatedResults}`,
            tags: ["agent", "openclaw", "collaboration"],
        });
        task.status = "completed";
        task.completedAt = Date.now();
        return task;
    }
    getCollaborativeTask(taskId) {
        return this.collaborativeTasks.get(taskId);
    }
    getTask(taskId) {
        return this.tasks.get(taskId);
    }
    getTasks(agentId) {
        const allTasks = Array.from(this.tasks.values());
        if (agentId) {
            return allTasks.filter(t => t.agentId === agentId);
        }
        return allTasks;
    }
    // Agent state management
    updateAgentState(agentId, field, value) {
        const state = this.agentStates.get(agentId);
        if (state) {
            if (field === "messagesSent") {
                state.messagesSent++;
            }
            else if (field === "messagesReceived") {
                state.messagesReceived++;
            }
            else if (field === "computeShare") {
                state.computeShare = value;
            }
            else if (field === "status") {
                state.status = value;
            }
            state.lastActive = Date.now();
            this.persistAgentStates();
        }
    }
    getAgentState(agentId) {
        return this.agentStates.get(agentId);
    }
    getAllAgentStates() {
        return Array.from(this.agentStates.values());
    }
    // Persistence - Fixed to actually parse and load states
    persistAgentStates() {
        try {
            const states = Array.from(this.agentStates.values());
            const stateData = states.map(s => ({
                id: s.agentId,
                share: s.computeShare,
                status: s.status,
                lastActive: s.lastActive,
                sent: s.messagesSent,
                received: s.messagesReceived,
            }));
            this.store.addBlock("journal", {
                type: "journal",
                content: `[OpenClaw] Agent states: ${JSON.stringify(stateData)}`,
                tags: ["agent", "openclaw", "state", "persist"],
            });
        }
        catch (error) {
            console.error("Failed to persist agent states:", error);
        }
    }
    loadAgentStates() {
        const blocks = this.store.readChain("journal");
        const stateBlocks = blocks
            .filter(b => b.data.tags?.includes("openclaw") && b.data.tags?.includes("persist"))
            .slice(-10); // Get last 10 state blocks
        for (const block of stateBlocks) {
            try {
                // Extract JSON from content
                const content = block.data.content;
                const jsonMatch = content.match(/Agent states: (.+)/);
                if (jsonMatch) {
                    const states = JSON.parse(jsonMatch[1]);
                    for (const state of states) {
                        const existingState = this.agentStates.get(state.id);
                        if (existingState) {
                            // Update with persisted values
                            existingState.computeShare = state.share;
                            existingState.status = state.status;
                            existingState.lastActive = state.lastActive;
                            existingState.messagesSent = state.sent;
                            existingState.messagesReceived = state.received;
                        }
                    }
                    console.log("📦 Loaded agent states from chain");
                }
            }
            catch (error) {
                // Ignore parsing errors
            }
        }
    }
    // Get recent messages from memory chain for context
    getMemoryContext(limit = 5) {
        const blocks = this.store.readChain("journal");
        const recentBlocks = blocks.slice(-limit);
        return recentBlocks.map(b => b.data.content);
    }
    // Request agent to perform a task
    async requestTask(agentId, task, context) {
        const agent = this.knownAgents.get(agentId);
        if (!agent) {
            throw new Error(`Agent ${agentId} not found`);
        }
        const memoryContext = this.getMemoryContext(3).join("\n");
        const fullTask = context
            ? `${task}\n\nContext from memory:\n${memoryContext}`
            : task;
        return this.sendMessage(agentId, fullTask);
    }
    getMessages() {
        return this.messages;
    }
    // Clear message history
    clearMessages() {
        this.messages = [];
        this.addMemory("Message history cleared");
    }
    // Get agent by capability
    findAgentsByCapability(capability) {
        return Array.from(this.knownAgents.values())
            .filter(agent => agent.capabilities.includes(capability));
    }
    // Find available agents (idle or active)
    findAvailableAgents() {
        return Array.from(this.knownAgents.values())
            .filter(agent => agent.status !== "connecting");
    }
    getStatus() {
        const agents = this.getAgents();
        const active = agents.filter(a => a.status === "active").length;
        const llmStatus = this.getLLMStatus();
        const providers = llmStatus.providers.join(", ") || "none";
        const collabTasks = Array.from(this.collaborativeTasks.values()).filter(t => t.status !== "completed").length;
        return `
╔══════════════════════════════════════════╗
║      🦞 OpenClaw Bridge Status           ║
╠══════════════════════════════════════════╣
║  Connected Agents: ${agents.length}                    
║  Active: ${active}                            
║  Messages: ${this.messages.length}                       
║  Tasks: ${this.tasks.size} | Collab: ${collabTasks}           
╠══════════════════════════════════════════╣
║  LLM Provider: ${llmStatus.provider.padEnd(22)}║  Available: ${providers.padEnd(24)}║  Status: ${llmStatus.available ? "✅ Active" : "⚠️  Simulation".padEnd(20)}╠══════════════════════════════════════════╣
║  Known Agents:                             
${agents.map(a => `║    • ${a.name.padEnd(20)} ${a.computeShare}% CPU`).join("\n")}
╚══════════════════════════════════════════╝
    `.trim();
    }
}
// CLI commands for agent management
export function runOpenClawCommands(args) {
    const bridge = new OpenClawBridge();
    if (args[0] === "status") {
        console.log(bridge.getStatus());
    }
    else if (args[0] === "list") {
        console.log("\n🦞 Connected Agents:\n");
        bridge.getAgents().forEach(agent => {
            const state = bridge.getAgentState(agent.id);
            console.log(`  ${agent.name} (${agent.did})`);
            console.log(`    Status: ${agent.status}`);
            console.log(`    Compute: ${agent.computeShare}%`);
            console.log(`    Capabilities: ${agent.capabilities.join(", ")}`);
            console.log(`    Provider: ${agent.provider || "default"}`);
            console.log(`    Messages: ${state?.messagesSent || 0} sent, ${state?.messagesReceived || 0} received\n`);
        });
    }
    else if (args[0] === "invite") {
        const agentId = args[1] || "openclaw-001";
        console.log(`\n🤝 Inviting agent ${agentId}...\n`);
        bridge.sendMessage(agentId, "Hello! Would you like to collaborate?").then(response => {
            console.log("Response:", response.content);
        });
    }
    else if (args[0] === "negotiate") {
        const agentId = args[1] || "openclaw-001";
        const share = parseInt(args[2]) || 50;
        const result = bridge.negotiateComputeShare(agentId, share);
        console.log(result.success ? `\n✅ ${result.message}` : `\n❌ ${result.message}`);
    }
    else if (args[0] === "task") {
        const agentId = args[1] || "openclaw-001";
        const task = args.slice(2).join(" ") || "Analyze my memory chains";
        console.log(`\n📋 Requesting task from ${agentId}...\n`);
        bridge.requestTask(agentId, task).then(response => {
            console.log("Response:", response.content);
        });
    }
    else if (args[0] === "queue") {
        const agentId = args[1] || "openclaw-001";
        const task = args.slice(2).join(" ") || "Analyze my memory chains";
        const taskObj = bridge.createTask(agentId, task);
        console.log(`\n📋 Task created: ${taskObj.id}`);
        console.log(`   Agent: ${agentId}`);
        console.log(`   Task: ${task}`);
        console.log(`\n⏳ Executing...\n`);
        bridge.executeTask(taskObj.id).then(completed => {
            console.log(`✅ Task ${completed.id} completed:`);
            console.log(completed.result);
        });
    }
    else if (args[0] === "collab" || args[0] === "collaborate") {
        // Multi-agent collaboration
        const description = args.slice(1).join(" ") || "Analyze and improve the codebase";
        console.log(`\n🤝 Creating collaborative task: ${description}\n`);
        bridge.createCollaborativeTask(description, "openclaw-001").then(async (task) => {
            // Delegate to specialists based on capabilities
            const delegations = new Map();
            const codeMaster = bridge.findAgentsByCapability("code-review")[0];
            if (codeMaster) {
                delegations.set(codeMaster.id, "Review the code and identify issues");
            }
            const dataSage = bridge.findAgentsByCapability("data-analysis")[0];
            if (dataSage) {
                delegations.set(dataSage.id, "Analyze any data patterns");
            }
            const researchBot = bridge.findAgentsByCapability("research")[0];
            if (researchBot) {
                delegations.set(researchBot.id, "Research best practices");
            }
            if (delegations.size > 0) {
                await bridge.delegateSubtasks(task.id, delegations);
                console.log(`📤 Delegated to ${delegations.size} agents\n`);
                const result = await bridge.executeCollaborativeTask(task.id);
                console.log("✅ Collaborative task completed:\n");
                for (const [agentId, resultText] of result.results) {
                    const agent = bridge.getAgent(agentId);
                    console.log(`${agent?.name}: ${resultText}\n`);
                }
            }
            else {
                console.log("❌ No suitable agents found for delegation");
            }
        });
    }
    else if (args[0] === "broadcast") {
        const message = args.slice(1).join(" ") || "Important update from Memphis";
        console.log(`\n📢 Broadcasting to all agents: "${message}"\n`);
        bridge.broadcastToAgents(message).then(responses => {
            responses.forEach((response, i) => {
                const agent = bridge.getAgent(response.from);
                console.log(`${agent?.name} responds: ${response.content}\n`);
            });
        });
    }
    else if (args[0] === "chat") {
        const fromId = args[1] || "openclaw-001";
        const toId = args[2] || "openclaw-002";
        const message = args.slice(3).join(" ") || "Hello, can you help me with code review?";
        console.log(`\n💬 ${fromId} → ${toId}: ${message}\n`);
        bridge.sendMessageBetweenAgents(fromId, toId, message).then(response => {
            console.log(`${response.from} responds:`);
            console.log(response.content);
        });
    }
    else if (args[0] === "capability") {
        const capability = args[1];
        if (capability) {
            const agents = bridge.findAgentsByCapability(capability);
            console.log(`\n🔍 Agents with "${capability}" capability:`);
            if (agents.length === 0) {
                console.log("  No agents found with this capability");
            }
            else {
                agents.forEach(agent => {
                    console.log(`  • ${agent.name} (${agent.computeShare}% compute)`);
                });
            }
        }
        else {
            console.log("\n❌ Please specify a capability to search for");
            console.log("Usage: openclaw capability <capability-name>");
        }
    }
    else if (args[0] === "clear") {
        bridge.clearMessages();
        console.log("\n🗑️  Message history cleared");
    }
    else if (args[0] === "context") {
        const limit = parseInt(args[1]) || 5;
        const context = bridge.getMemoryContext(limit);
        console.log("\n📜 Recent memory context:");
        context.forEach((c, i) => {
            console.log(`  ${i + 1}. ${c.substring(0, 80)}...`);
        });
    }
    else if (args[0] === "states") {
        console.log("\n📊 Agent States:\n");
        bridge.getAllAgentStates().forEach(state => {
            const agent = bridge.getAgent(state.agentId);
            console.log(`  ${agent?.name || state.agentId}:`);
            console.log(`    Status: ${state.status}`);
            console.log(`    Compute: ${state.computeShare}%`);
            console.log(`    Messages: ${state.messagesSent} sent, ${state.messagesReceived} received`);
            console.log(`    Last Active: ${new Date(state.lastActive).toLocaleString()}\n`);
        });
    }
    else if (args[0] === "help") {
        console.log(`
╔══════════════════════════════════════════════════════════════════╗
║                    🦞 OpenClaw Commands                       ║
╠══════════════════════════════════════════════════════════════════╣
║  status              Show bridge status                        ║
║  list                List connected agents                     ║
║  invite [id]         Invite new agent                          ║
║  negotiate [id] <n>  Negotiate compute share (%)               ║
║  task [id] <task>   Request agent to perform task             ║
║  queue [id] <task>  Create and execute task in queue          ║
║  collab <desc>       Multi-agent collaboration                 ║
║  broadcast <msg>     Broadcast to all agents                  ║
║  chat [f] [t] <msg> Agent-to-agent messaging                  ║
║  capability <name>  Find agents by capability                 ║
║  clear               Clear message history                     ║
║  context [n]         Get recent memory context                 ║
║  states              Show agent states                         ║
╠══════════════════════════════════════════════════════════════════╣
║  Example: memphis agent openclaw collab Analyze my code       ║
╚══════════════════════════════════════════════════════════════════╝
    `.trim());
    }
    else {
        console.log(`
🦞 OpenClaw Bridge Commands:
  status              - Show bridge status
  list                - List connected agents
  invite [id]         - Invite new agent
  negotiate [id] <n>  - Negotiate compute share (%)
  task [id] <task>    - Request agent to perform task
  queue [id] <task>   - Create and execute task in queue
  collab <desc>       - Multi-agent collaboration
  broadcast <msg>      - Broadcast to all agents
  chat [from] [to] <msg> - Agent-to-agent messaging
  capability <name>   - Find agents by capability
  clear               - Clear message history
  context [n]         - Get recent memory context (default: 5)
  states              - Show agent states

Run 'openclaw help' for full details.
    `.trim());
    }
}
//# sourceMappingURL=openclaw.js.map