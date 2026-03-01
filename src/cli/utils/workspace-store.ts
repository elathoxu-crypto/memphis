import { Store, StoreError, type IStore } from "../../memory/store.js";
import type { Block, BlockData } from "../../memory/chain.js";
import { loadConfig, type MemphisConfig } from "../../config/loader.js";
import { CHAINS_PATH } from "../../config/defaults.js";
import type { WorkspaceDefinition, SecurityConfig, WorkspaceSelection } from "../../security/workspace.js";
import { readWorkspaceSelection } from "../../security/workspace.js";
import { DEFAULT_ALLOWED_CHAINS } from "../../security/constants.js";

interface WorkspaceStoreContext {
  config: MemphisConfig;
  store: Store;
  guard: WorkspaceGuard;
  workspace: WorkspaceDefinition;
}

class WorkspaceGuard implements IStore {
  private readonly allowAll: boolean;
  private readonly allowedChains: Set<string>;

  constructor(
    private readonly store: Store,
    private readonly workspace: WorkspaceDefinition,
  ) {
    const allowed = new Set<string>();
    if (workspace.policy.includeDefault) {
      DEFAULT_ALLOWED_CHAINS.forEach(chain => allowed.add(chain));
    }
    workspace.policy.allowedChains.forEach(chain => allowed.add(chain));
    this.allowAll = allowed.has("*");
    this.allowedChains = allowed;
  }

  private ensureChainAllowed(chain: string): void {
    if (this.allowAll) return;
    if (this.allowedChains.has(chain)) return;
    throw new StoreError(
      `Workspace "${this.workspace.id}" cannot access chain "${chain}"`,
      "WORKSPACE_DENIED",
    );
  }

  private withWorkspaceTags(data: BlockData): BlockData {
    const workspaceTags = this.workspace.policy.tags;
    if (!workspaceTags?.length) {
      return data;
    }
    const unique = new Set<string>([...(data.tags ?? []), ...workspaceTags]);
    return { ...data, tags: Array.from(unique) };
  }

  getBasePath(): string {
    return this.store.getBasePath();
  }

  async appendBlock(chain: string, data: BlockData): Promise<Block> {
    this.ensureChainAllowed(chain);
    return this.store.appendBlock(chain, this.withWorkspaceTags(data));
  }

  addBlock(chain: string, data: BlockData): Block {
    this.ensureChainAllowed(chain);
    return this.store.addBlock(chain, this.withWorkspaceTags(data));
  }

  readChain(chain: string): Block[] {
    this.ensureChainAllowed(chain);
    return this.store.readChain(chain);
  }

  getLastBlock(chain: string): Block | undefined {
    this.ensureChainAllowed(chain);
    return this.store.getLastBlock(chain);
  }

  listChains(): string[] {
    const chains = this.store.listChains();
    if (this.allowAll) return chains;
    return chains.filter(chain => this.allowedChains.has(chain));
  }

  getChainStats(chain: string): { blocks: number; first?: string; last?: string } {
    this.ensureChainAllowed(chain);
    return this.store.getChainStats(chain);
  }
}

function resolveWorkspaceId(security: SecurityConfig, selection: WorkspaceSelection | null): string {
  const envOverride = process.env.MEMPHIS_WORKSPACE?.trim();
  if (envOverride && security.workspaceMap[envOverride]) {
    return envOverride;
  }
  if (selection?.id && security.workspaceMap[selection.id]) {
    return selection.id;
  }
  return security.defaultWorkspace;
}

export function createWorkspaceStore(): WorkspaceStoreContext {
  const config = loadConfig();
  const store = new Store(config.memory?.path || CHAINS_PATH);
  const selection = readWorkspaceSelection();
  const workspaceId = resolveWorkspaceId(config.security, selection);
  const workspace =
    config.security.workspaceMap[workspaceId] ?? config.security.workspaceMap[config.security.defaultWorkspace];
  if (!workspace) {
    throw new StoreError(`Workspace '${workspaceId}' is not defined`, "WORKSPACE_UNDEFINED");
  }
  const guard = new WorkspaceGuard(store, workspace);
  return { config, store, guard, workspace };
}
