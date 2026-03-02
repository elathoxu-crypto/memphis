#!/bin/bash
# Memphis Frictionless Capture - Shell Aliases Setup
# 
# This script adds convenient aliases for ultra-fast decision capture

echo "╔═══════════════════════════════════════════════════════════╗"
echo "║       Memphis Frictionless Capture Setup ⚡              ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""

# Detect shell
SHELL_NAME=$(basename "$SHELL")
RC_FILE=""

if [ "$SHELL_NAME" = "bash" ]; then
    RC_FILE="$HOME/.bashrc"
elif [ "$SHELL_NAME" = "zsh" ]; then
    RC_FILE="$HOME/.zshrc"
else
    echo "⚠️  Shell $SHELL_NAME not supported (bash/zsh only)"
    echo "   Add these aliases manually to your shell config:"
    echo ""
    echo "   alias md='memphis decide-fast'"
    echo "   alias mda='memphis decide-fast --ask'"
    echo ""
    exit 1
fi

echo "📝 Detected shell: $SHELL_NAME"
echo "📝 Config file: $RC_FILE"
echo ""

# Check if aliases already exist
if grep -q "alias md=" "$RC_FILE" 2>/dev/null; then
    echo "✓ Aliases already configured in $RC_FILE"
    echo ""
    echo "Aliases:"
    echo "  md <title>           - Fast decision capture"
    echo "  mda <title>          - Decision with reasoning prompt"
    echo ""
    exit 0
fi

# Add aliases
echo "🚀 Adding aliases to $RC_FILE..."
echo "" >> "$RC_FILE"
echo "# Memphis - Frictionless Decision Capture" >> "$RC_FILE"
echo "alias md='memphis decide-fast'" >> "$RC_FILE"
echo "alias mda='memphis decide-fast --ask'" >> "$RC_FILE"
echo "" >> "$RC_FILE"

echo "✓ Aliases added!"
echo ""
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║                    Aliases Installed ✅                   ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""
echo "Usage:"
echo "  md \"use TypeScript not JavaScript\"      # <100ms capture"
echo "  md \"switch to React\" --why \"better ecosystem\""
echo "  mda \"use Docker\"                         # ask for reasoning"
echo ""
echo "Reload your shell:"
echo "  source $RC_FILE"
echo ""
echo "Or open a new terminal."
echo ""
