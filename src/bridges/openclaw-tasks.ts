import { Store } from "../memory/store.js";
import type { AgentMessage, CollaborativeTask, SubTask, Task } from "./openclaw-types.js";
import type { OpenClawAgentRegistry } from "./openclaw-agents.js";
import type { OpenClawLLMRouter } from "./openclaw-llm.js";

interface TaskManagerOptions {
  addMemory: (content: string) => void;
  sendMessage: (agentId: string, task: string) => Promise<AgentMessage>;
  agentRegistry: OpenClawAgentRegistry;
  llmRouter: OpenClawLLMRouter;
  store: Store;
}

export class OpenClawTaskManager {
  private tasks: Map<string, Task> = new Map();
  private collaborativeTasks: Map<string, CollaborativeTask> = new Map();

  constructor(private readonly options: TaskManagerOptions) {}

  createTask(agentId: string, task: string): Task {
    const taskObj: Task = {
      id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      agentId,
      task,
      status: "pending",
      createdAt: Date.now(),
    };

    this.tasks.set(taskObj.id, taskObj);
    this.options.addMemory(`Task created for ${agentId}: ${task.substring(0, 30)}...`);

    return taskObj;
  }

  async executeTask(taskId: string): Promise<Task> {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error("Task not found");
    }

    task.status = "running";
    this.options.agentRegistry.updateAgentState(task.agentId, "status", "active");

    try {
      const response = await this.options.sendMessage(task.agentId, task.task);
      task.status = "completed";
      task.result = response.content;
      task.completedAt = Date.now();
    } catch (error) {
      task.status = "failed";
      task.result = `Error: ${error}`;
      task.completedAt = Date.now();
    }

    this.options.agentRegistry.updateAgentState(task.agentId, "status", "idle");
    return task;
  }

  async createCollaborativeTask(description: string, leadAgentId: string): Promise<CollaborativeTask> {
    const task: CollaborativeTask = {
      id: `collab-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      description,
      subtasks: [],
      status: "pending",
      leadAgent: leadAgentId,
      results: new Map(),
      createdAt: Date.now(),
    };

    this.collaborativeTasks.set(task.id, task);
    this.options.addMemory(`Collaborative task created: ${description.substring(0, 30)}...`);

    return task;
  }

  async delegateSubtasks(taskId: string, taskDescriptions: Map<string, string>): Promise<CollaborativeTask> {
    const task = this.collaborativeTasks.get(taskId);
    if (!task) {
      throw new Error("Collaborative task not found");
    }

    task.status = "delegating";

    for (const [agentId, description] of taskDescriptions) {
      const agent = this.options.agentRegistry.getAgent(agentId);
      if (!agent) continue;

      const subtask: SubTask = {
        id: `subtask-${task.id}-${task.subtasks.length}`,
        agentId,
        description,
        status: "assigned",
      };

      task.subtasks.push(subtask);
    }

    this.options.addMemory(`Delegated ${task.subtasks.length} subtasks for collaborative task ${task.id}`);
    return task;
  }

  async executeCollaborativeTask(taskId: string): Promise<CollaborativeTask> {
    const task = this.collaborativeTasks.get(taskId);
    if (!task) {
      throw new Error("Collaborative task not found");
    }

    task.status = "running";

    const subtaskPromises = task.subtasks.map(async subtask => {
      try {
        let response: AgentMessage;
        if (this.options.llmRouter.hasAvailableLLM()) {
          response = await this.options.llmRouter.getLLMResponse(subtask.agentId, subtask.description);
        } else {
          response = await this.options.llmRouter.simulateResponse(subtask.agentId, subtask.description);
        }
        subtask.result = response.content;
        subtask.status = "completed";
        task.results.set(subtask.agentId, response.content);
      } catch (error) {
        subtask.status = "failed";
        subtask.result = `Error: ${error}`;
      }
    });

    await Promise.all(subtaskPromises);

    task.status = "aggregating";
    const aggregatedResults = Array.from(task.results.entries())
      .map(([agentId, result]) => {
        const agent = this.options.agentRegistry.getAgent(agentId);
        return `${agent?.name || agentId}: ${result}`;
      })
      .join("\n\n");

    await this.options.store.appendBlock("journal", {
      type: "journal",
      content: `[OpenClaw] Collaborative task ${task.id} results:\n${aggregatedResults}`,
      tags: ["agent", "openclaw", "collaboration"],
    });

    task.status = "completed";
    task.completedAt = Date.now();

    return task;
  }

  getCollaborativeTask(taskId: string): CollaborativeTask | undefined {
    return this.collaborativeTasks.get(taskId);
  }

  getCollaborativeTasks(): CollaborativeTask[] {
    return Array.from(this.collaborativeTasks.values());
  }

  getTask(taskId: string): Task | undefined {
    return this.tasks.get(taskId);
  }

  getTasks(agentId?: string): Task[] {
    const allTasks = Array.from(this.tasks.values());
    if (agentId) {
      return allTasks.filter(t => t.agentId === agentId);
    }
    return allTasks;
  }
}
