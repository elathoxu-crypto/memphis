#!/usr/bin/env bash
#
# Memphis Chain Repair Automation Script
# Automatically detects and repairs chain issues
#
# @version 3.0.1
# @date 2026-03-03

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
MEMPHIS_HOME="${MEMPHIS_HOME:-$HOME/.memphis}"
QUARANTINE_DIR="$MEMPHIS_HOME/quarantine"
LOG_FILE="$MEMPHIS_HOME/logs/repair.log"
MEMPHIS_CLI="node $(git rev-parse --show-toplevel 2>/dev/null || echo ".")/dist/cli/index.js"

# Parse arguments
MODE="${1:-check}"
AUTO_REPAIR="${2:-false}"

# Ensure directories exist
mkdir -p "$QUARANTINE_DIR"
mkdir -p "$(dirname "$LOG_FILE")"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
    echo "$1"
}

echo "🔧 Memphis Chain Repair Automation"
echo "═══════════════════════════════════════════════════════"
echo ""
echo "Mode: $MODE"
echo "Auto-repair: $AUTO_REPAIR"
echo ""

# Function to check chain integrity
check_chain() {
    local chain_name=$1
    local chain_file="$MEMPHIS_HOME/chains/$chain_name.json"
    
    if [ ! -f "$chain_file" ]; then
        return 0  # Chain doesn't exist, skip
    fi
    
    # Check for broken blocks
    local broken_count=$(grep -c '"broken":true' "$chain_file" 2>/dev/null || echo "0")
    
    if [ "$broken_count" -gt 0 ]; then
        echo -e "${RED}✗ $chain_name: $broken_count broken blocks${NC}"
        return 1
    else
        echo -e "${GREEN}✓ $chain_name: healthy${NC}"
        return 0
    fi
}

# Function to repair chain
repair_chain() {
    local chain_name=$1
    local chain_file="$MEMPHIS_HOME/chains/$chain_name.json"
    local backup_file="$MEMPHIS_HOME/backups/repair-backup-$chain_name-$(date +%Y%m%d-%H%M%S).json"
    
    if [ ! -f "$chain_file" ]; then
        return 0
    fi
    
    log "Repairing chain: $chain_name"
    
    # Backup before repair
    cp "$chain_file" "$backup_file"
    log "  Backup created: $backup_file"
    
    # Find and quarantine broken blocks
    local broken_indices=$(grep -n '"broken":true' "$chain_file" | cut -d: -f1)
    
    if [ -n "$broken_indices" ]; then
        log "  Found broken blocks at lines: $broken_indices"
        
        # Create quarantine file for this repair
        local quarantine_file="$QUARANTINE_DIR/$chain_name-broken-$(date +%Y%m%d-%H%M%S).json"
        
        # Extract broken blocks to quarantine
        echo "[" > "$quarantine_file"
        local first=true
        
        for line_num in $broken_indices; do
            # Extract block (simplified - in production would parse full JSON block)
            if [ "$first" = true ]; then
                first=false
            else
                echo "," >> "$quarantine_file"
            fi
            
            # Get context around broken marker (10 lines before and after)
            tail -n +$((line_num - 10)) "$chain_file" | head -n 20 >> "$quarantine_file"
        done
        
        echo "]" >> "$quarantine_file"
        log "  Quarantined broken blocks: $quarantine_file"
        
        # Remove broken blocks from chain (simplified)
        # In production, would properly parse JSON and rebuild chain
        grep -v '"broken":true' "$chain_file" > "${chain_file}.tmp"
        mv "${chain_file}.tmp" "$chain_file"
        
        log "  Repaired: $chain_file"
        echo -e "${GREEN}✓ Repaired: $chain_name${NC}"
    else
        log "  No broken blocks found"
        echo -e "${GREEN}✓ No repairs needed: $chain_name${NC}"
    fi
}

# Function to verify all chains
verify_all_chains() {
    echo "🔍 Verifying all chains..."
    echo ""
    
    local chains=("journal" "decision" "ask" "share" "soul" "vault" "summary" "decisions")
    local issues_found=0
    
    for chain in "${chains[@]}"; do
        if ! check_chain "$chain"; then
            ((issues_found++))
        fi
    done
    
    echo ""
    
    if [ "$issues_found" -gt 0 ]; then
        echo -e "${YELLOW}⚠️  Found issues in $issues_found chain(s)${NC}"
        return 1
    else
        echo -e "${GREEN}✓ All chains healthy${NC}"
        return 0
    fi
}

# Function to repair all chains
repair_all_chains() {
    echo "🔧 Repairing all chains..."
    echo ""
    
    log "=== REPAIR SESSION STARTED ==="
    log "Mode: $MODE"
    log "Timestamp: $(date -Iseconds)"
    
    local chains=("journal" "decision" "ask" "share" "soul" "vault" "summary" "decisions")
    
    for chain in "${chains[@]}"; do
        repair_chain "$chain"
    done
    
    log "=== REPAIR SESSION COMPLETED ==="
    
    echo ""
    echo -e "${GREEN}✅ Repair session complete${NC}"
}

# Main logic
case "$MODE" in
    check)
        verify_all_chains
        ;;
    
    repair)
        if [ "$AUTO_REPAIR" = "true" ] || [ "$AUTO_REPAIR" = "--auto" ]; then
            repair_all_chains
        else
            echo -e "${YELLOW}Manual repair mode${NC}"
            echo ""
            echo "This will:"
            echo "  • Create backups before repair"
            echo "  • Quarantine broken blocks"
            echo "  • Remove broken blocks from chains"
            echo ""
            read -p "Continue? (y/N) " -n 1 -r
            echo ""
            
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                repair_all_chains
            else
                echo "Repair cancelled"
                exit 0
            fi
        fi
        ;;
    
    verify)
        if [ -f "$(dirname $MEMPHIS_CLI)/cli/index.js" ]; then
            echo "🔐 Running Memphis verify..."
            $MEMPHIS_CLI verify
        else
            verify_all_chains
        fi
        ;;
    
    quarantine-list)
        echo "📋 Quarantined blocks:"
        echo ""
        if [ -d "$QUARANTINE_DIR" ] && [ "$(ls -A $QUARANTINE_DIR 2>/dev/null)" ]; then
            ls -lht "$QUARANTINE_DIR"
        else
            echo "  No quarantined blocks"
        fi
        ;;
    
    quarantine-clean)
        echo "🧹 Cleaning quarantine..."
        read -p "Delete all quarantined blocks? (y/N) " -n 1 -r
        echo ""
        
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            rm -rf "$QUARANTINE_DIR"/*
            echo -e "${GREEN}✓ Quarantine cleaned${NC}"
        else
            echo "Cancelled"
        fi
        ;;
    
    *)
        echo "Usage: $0 {check|repair|verify|quarantine-list|quarantine-clean}"
        echo ""
        echo "Commands:"
        echo "  check            Check all chains for issues"
        echo "  repair           Repair all chains (interactive)"
        echo "  repair --auto    Repair all chains (automatic)"
        echo "  verify           Run Memphis verify command"
        echo "  quarantine-list  List quarantined blocks"
        echo "  quarantine-clean Delete quarantined blocks"
        exit 1
        ;;
esac

echo ""
echo "═══════════════════════════════════════════════════════"
echo "📁 File locations:"
echo "  • Logs: $LOG_FILE"
echo "  • Quarantine: $QUARANTINE_DIR"
echo "  • Backups: $MEMPHIS_HOME/backups/"
echo "═══════════════════════════════════════════════════════"
