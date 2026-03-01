import chalk from "chalk";
import { MemphisMcpServer } from "../../mcp/server.js";
import { memphisToolDefinitions } from "../../mcp/tools.js";

export interface McpInspectOptions {
  json?: boolean;
}

export async function mcpStartCommand(): Promise<void> {
  const server = new MemphisMcpServer();
  console.error(chalk.dim("Starting Memphis MCP server (stdio transport)…"));
  await server.start();
}

export function mcpInspectCommand(options: McpInspectOptions = {}): void {
  if (options.json) {
    console.log(JSON.stringify(memphisToolDefinitions, null, 2));
    return;
  }

  console.log(chalk.bold("\nMemphis MCP Tools\n"));
  for (const tool of memphisToolDefinitions) {
    const required = tool.inputSchema.required?.length
      ? tool.inputSchema.required.join(", ")
      : "none";
    console.log(`${chalk.cyan(tool.name)}`);
    console.log(`  ${tool.description}`);
    console.log(chalk.dim(`  required: ${required}`));
    const fields = Object.keys(tool.inputSchema.properties);
    if (fields.length) {
      console.log(chalk.gray(`  fields: ${fields.join(", ")}`));
    }
    console.log();
  }
}
