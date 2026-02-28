// OpenClaw CLI commands — extracted from openclaw.ts
import { OpenClawBridge } from "./openclaw.js";

export function runOpenClawCommands(args: string[]): void {
  const bridge = new OpenClawBridge();

  if (args[0] === "status") {
    console.log(bridge.getStatus());
  } else if (args[0] === "list") {
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
  } else if (args[0] === "invite") {
    const agentId = args[1] || "openclaw-001";
    console.log(`\n🤝 Inviting agent ${agentId}...\n`);
    bridge.sendMessage(agentId, "Hello! Would you like to collaborate?").then(response => {
      console.log("Response:", response.content);
    });
  } else if (args[0] === "negotiate") {
    const agentId = args[1] || "openclaw-001";
    const share = parseInt(args[2]) || 50;
    const result = bridge.negotiateComputeShare(agentId, share);
    console.log(result.success ? `\n✅ ${result.message}` : `\n❌ ${result.message}`);
  } else if (args[0] === "task") {
    const agentId = args[1] || "openclaw-001";
    const task = args.slice(2).join(" ") || "Analyze my memory chains";
    console.log(`\n📋 Requesting task from ${agentId}...\n`);
    bridge.requestTask(agentId, task).then(response => {
      console.log("Response:", response.content);
    });
  } else if (args[0] === "queue") {
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
  } else if (args[0] === "collab" || args[0] === "collaborate") {
    // Multi-agent collaboration
    const description = args.slice(1).join(" ") || "Analyze and improve the codebase";
    console.log(`\n🤝 Creating collaborative task: ${description}\n`);
    
    bridge.createCollaborativeTask(description, "openclaw-001").then(async task => {
      // Delegate to specialists based on capabilities
      const delegations = new Map<string, string>();
      
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
      } else {
        console.log("❌ No suitable agents found for delegation");
      }
    });
  } else if (args[0] === "broadcast") {
    const message = args.slice(1).join(" ") || "Important update from Memphis";
    console.log(`\n📢 Broadcasting to all agents: "${message}"\n`);
    bridge.broadcastToAgents(message).then(responses => {
      responses.forEach((response, i) => {
        const agent = bridge.getAgent(response.from);
        console.log(`${agent?.name} responds: ${response.content}\n`);
      });
    });
  } else if (args[0] === "chat") {
    const fromId = args[1] || "openclaw-001";
    const toId = args[2] || "openclaw-002";
    const message = args.slice(3).join(" ") || "Hello, can you help me with code review?";
    console.log(`\n💬 ${fromId} → ${toId}: ${message}\n`);
    bridge.sendMessageBetweenAgents(fromId, toId, message).then(response => {
      console.log(`${response.from} responds:`);
      console.log(response.content);
    });
  } else if (args[0] === "capability") {
    const capability = args[1];
    if (capability) {
      const agents = bridge.findAgentsByCapability(capability);
      console.log(`\n🔍 Agents with "${capability}" capability:`);
      if (agents.length === 0) {
        console.log("  No agents found with this capability");
      } else {
        agents.forEach(agent => {
          console.log(`  • ${agent.name} (${agent.computeShare}% compute)`);
        });
      }
    } else {
      console.log("\n❌ Please specify a capability to search for");
      console.log("Usage: openclaw capability <capability-name>");
    }
  } else if (args[0] === "clear") {
    bridge.clearMessages();
    console.log("\n🗑️  Message history cleared");
  } else if (args[0] === "context") {
    const limit = parseInt(args[1]) || 5;
    const context = bridge.getMemoryContext(limit);
    console.log("\n📜 Recent memory context:");
    context.forEach((c, i) => {
      console.log(`  ${i + 1}. ${c.substring(0, 80)}...`);
    });
  } else if (args[0] === "states") {
    console.log("\n📊 Agent States:\n");
    bridge.getAllAgentStates().forEach(state => {
      const agent = bridge.getAgent(state.agentId);
      console.log(`  ${agent?.name || state.agentId}:`);
      console.log(`    Status: ${state.status}`);
      console.log(`    Compute: ${state.computeShare}%`);
      console.log(`    Messages: ${state.messagesSent} sent, ${state.messagesReceived} received`);
      console.log(`    Last Active: ${new Date(state.lastActive).toLocaleString()}\n`);
    });
  } else if (args[0] === "help") {
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
    `.trim());
  } else {
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
