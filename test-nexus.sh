#!/bin/bash
# Test Memphis Nexus TUI
cd ~/memphis
echo "Starting Memphis Nexus TUI..."
echo "Commands available:"
echo "  /help - Show commands"
echo "  /clear - Clear chat"
echo "  /agents - List agents"
echo "  /status - System status"
echo "  Ctrl+C - Exit"
echo ""
timeout 10 npx tsx src/tui-v2/nexus-poc.ts 2>&1 || echo "Test completed (timeout OK)"
