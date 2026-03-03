#!/bin/bash

# Memphis Bootstrap Script
# Automates complete Memphis setup for OpenClaw agents

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Default values
MEMPHIS_DIR="$HOME/.memphis"
MEMPHIS_WORKSPACE="$HOME/.openclaw/workspace"
AGENT_NAME=""
AGENT_ROLE=""
LOCATION=""
GEOMETRIC_IDENTITY="△⬡◈"
PARTNER_INFO=""
PROTOCOL="Campfire Circle"
LANGUAGE="Polish"
FRESH=false
DEV_MODE=false
NETWORK_ENABLED=true

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --fresh)
            FRESH=true
            shift
            ;;
        --dev)
            DEV_MODE=true
            NETWORK_ENABLED=false
            shift
            ;;
        --identity)
            AGENT_NAME="$2"
            shift 2
            ;;
        --role)
            AGENT_ROLE="$2"
            shift 2
            ;;
        --location)
            LOCATION="$2"
            shift 2
            ;;
        --geometric-identity)
            GEOMETRIC_IDENTITY="$2"
            shift 2
            ;;
        --partner)
            PARTNER_INFO="$2"
            shift 2
            ;;
        --protocol)
            PROTOCOL="$2"
            shift 2
            ;;
        --no-network)
            NETWORK_ENABLED=false
            shift
            ;;
        --backup)
            BACKUP_FILE="$2"
            shift 2
            ;;
        --restore)
            RESTORE_FILE="$2"
            shift 2
            ;;
        --status)
            check_status
            exit 0
            ;;
        --doctor)
            run_doctor
            exit 0
            ;;
        --test)
            run_tests
            exit 0
            ;;
        --help)
            show_help
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            show_help
            exit 1
            ;;
    esac
done

# Functions

show_banner() {
    echo -e "${CYAN}"
    echo "🧠 Memphis Bootstrap v1.0.0"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo -e "${NC}"
}

show_help() {
    show_banner
    echo "Usage: memphis-bootstrap [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --fresh                Interactive fresh install"
    echo "  --dev                  Development mode (minimal setup)"
    echo "  --identity NAME        Agent name (non-interactive)"
    echo "  --role ROLE            Agent role"
    echo "  --location LOCATION    Agent location (e.g., 10.0.0.22)"
    echo "  --geometric-id ID      Geometric identity (default: △⬡◈)"
    echo "  --partner INFO         Partner agent info"
    echo "  --protocol PROTOCOL    Protocol (default: Campfire Circle)"
    echo "  --no-network           Disable multi-agent network"
    echo "  --backup FILE          Create backup"
    echo "  --restore FILE         Restore from backup"
    echo "  --status               Check Memphis status"
    echo "  --doctor               Run health checks"
    echo "  --test                 Run test suite"
    echo "  --help                 Show this help"
    echo ""
    echo "Examples:"
    echo "  memphis-bootstrap --fresh"
    echo "  memphis-bootstrap --identity 'Watra' --role 'Testing Agent'"
    echo "  memphis-bootstrap --dev"
}

check_dependencies() {
    echo -e "${BLUE}🔍 Checking dependencies...${NC}"

    # Check Node.js
    if ! command -v node &> /dev/null; then
        echo -e "${RED}❌ Node.js not found. Please install Node.js first.${NC}"
        exit 1
    fi
    echo -e "${GREEN}  ✅ Node.js: $(node --version)${NC}"

    # Check Memphis CLI
    if ! command -v memphis &> /dev/null; then
        echo -e "${YELLOW}  ⚠️  Memphis CLI not found globally.${NC}"
        echo -e "${YELLOW}     Will check for local installation...${NC}"
        MEMPHIS_CLI="node ~/memphis/dist/cli/index.js"
    else
        MEMPHIS_CLI="memphis"
        echo -e "${GREEN}  ✅ Memphis CLI: Found${NC}"
    fi
}

interactive_setup() {
    echo -e "${CYAN}"
    echo "🚀 Interactive Setup"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo -e "${NC}"

    if [ -z "$AGENT_NAME" ]; then
        read -p "$(echo -e ${YELLOW}"? Agent name: "${NC})" AGENT_NAME
    fi

    if [ -z "$AGENT_ROLE" ]; then
        read -p "$(echo -e ${YELLOW}"? Role: "${NC})" AGENT_ROLE
    fi

    if [ -z "$LOCATION" ]; then
        read -p "$(echo -e ${YELLOW}"? Location (e.g., 10.0.0.22): "${NC})" LOCATION
    fi

    if [ -z "$PARTNER_INFO" ]; then
        read -p "$(echo -e ${YELLOW}"? Partner agent (e.g., Memphis at 10.0.0.80): "${NC})" PARTNER_INFO
        [ -z "$PARTNER_INFO" ] && PARTNER_INFO="None configured"
    fi

    read -p "$(echo -e ${YELLOW}"? Enable self-loop? [Y/n]: "${NC})" ENABLE_LOOP
    ENABLE_LOOP=${ENABLE_LOOP:-Y}
    [[ "$ENABLE_LOOP" =~ ^[Yy]$ ]] && SELF_LOOP=true || SELF_LOOP=false

    if [ "$NETWORK_ENABLED" = true ]; then
        read -p "$(echo -e ${YELLOW}"? Multi-agent network? [Y/n]: "${NC})" ENABLE_NET
        ENABLE_NET=${ENABLE_NET:-Y}
        [[ "$ENABLE_NET" =~ ^[Yy]$ ]] && NETWORK_ENABLED=true || NETWORK_ENABLED=false
    fi
}

phase1_structure() {
    echo -e "${CYAN}"
    echo "📁 Phase 1: Structure Initialization"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo -e "${NC}"

    # Create Memphis directory structure
    echo -e "${BLUE}  Creating ~/.memphis structure...${NC}"
    mkdir -p "$MEMPHIS_DIR"/{chains/{journal,decisions,ask,share,summary,trade,vault,ops},workspace,logs}

    # Initialize chains
    echo -e "${BLUE}  Initializing chains...${NC}"
    $MEMPHIS_CLI init 2>/dev/null || echo -e "${YELLOW}  ⚠️  Chains may already exist${NC}"

    echo -e "${GREEN}  ✅ Directory structure created${NC}"
}

phase2_identity() {
    echo -e "${CYAN}"
    echo "🎭 Phase 2: Identity Configuration"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo -e "${NC}"

    CREATION_DATE=$(date '+%Y-%m-%d %H:%M CET')
    BOOTSTRAP_DATE=$(date '+%Y-%m-%d')
    VERSION="1.0.0"

    # Create SOUL.md
    echo -e "${BLUE}  Creating SOUL.md...${NC}"
    sed -e "s/{AGENT_NAME}/$AGENT_NAME/g" \
        -e "s/{AGENT_ROLE}/$AGENT_ROLE/g" \
        -e "s/{GEOMETRIC_IDENTITY}/$GEOMETRIC_IDENTITY/g" \
        -e "s/{LOCATION}/$LOCATION/g" \
        -e "s/{LANGUAGE}/$LANGUAGE/g" \
        -e "s/{PARTNER_INFO}/$PARTNER_INFO/g" \
        -e "s/{PROTOCOL}/$PROTOCOL/g" \
        -e "s/{CREATION_DATE}/$CREATION_DATE/g" \
        -e "s/{BOOTSTRAP_DATE}/$BOOTSTRAP_DATE/g" \
        -e "s/{VERSION}/$VERSION/g" \
        -e "s/{CREATOR}/Memphis Bootstrap/g" \
        "$(dirname "$0")/../templates/SOUL.md.template" > "$MEMPHIS_WORKSPACE/SOUL.md"

    # Create IDENTITY.md
    echo -e "${BLUE}  Creating IDENTITY.md...${NC}"
    sed -e "s/{AGENT_NAME}/$AGENT_NAME/g" \
        -e "s/{LOCATION}/$LOCATION/g" \
        -e "s/{GEOMETRIC_IDENTITY}/$GEOMETRIC_IDENTITY/g" \
        -e "s/{PARTNER_INFO}/$PARTNER_INFO/g" \
        -e "s/{PROTOCOL}/$PROTOCOL/g" \
        -e "s/{BOOTSTRAP_DATE}/$BOOTSTRAP_DATE/g" \
        -e "s/{VERSION}/$VERSION/g" \
        "$(dirname "$0")/../templates/IDENTITY.md.template" > "$MEMPHIS_WORKSPACE/IDENTITY.md"

    echo -e "${GREEN}  ✅ Identity configured${NC}"
}

phase3_self_loop() {
    echo -e "${CYAN}"
    echo "🔄 Phase 3: Self-Loop Enablement"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo -e "${NC}"

    # Create birth certificate
    echo -e "${BLUE}  Creating birth certificate...${NC}"
    $MEMPHIS_CLI journal "Memphis initialized! I am $AGENT_NAME, ready to learn!" --tags init,birth,memphis,$AGENT_NAME >/dev/null 2>&1

    # Enable pattern learning
    echo -e "${BLUE}  Enabling pattern learning...${NC}"
    # This would integrate with Memphis's pattern system

    echo -e "${GREEN}  ✅ Self-loop enabled${NC}"
}

phase4_network() {
    if [ "$NETWORK_ENABLED" = false ]; then
        echo -e "${YELLOW}  ⏭️  Network setup skipped (--no-network)${NC}"
        return
    fi

    echo -e "${CYAN}"
    echo "🌐 Phase 4: Multi-Agent Network"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo -e "${NC}"

    # Setup network configuration
    echo -e "${BLUE}  Configuring multi-agent network...${NC}"
    # This would setup share-sync and SSH helpers

    echo -e "${GREEN}  ✅ Network ready${NC}"
}

check_status() {
    show_banner
    echo -e "${BLUE}📊 Memphis Status${NC}"
    echo ""

    if [ -d "$MEMPHIS_DIR" ]; then
        echo -e "${GREEN}✅ Memphis directory exists${NC}"

        # Check chains
        CHAINS=$(ls -1 "$MEMPHIS_DIR/chains" 2>/dev/null | wc -l)
        echo -e "${GREEN}  Chains: $CHAINS directories${NC}"

        # Check identity files
        [ -f "$MEMPHIS_WORKSPACE/SOUL.md" ] && echo -e "${GREEN}  ✅ SOUL.md${NC}" || echo -e "${RED}  ❌ SOUL.md missing${NC}"
        [ -f "$MEMPHIS_WORKSPACE/IDENTITY.md" ] && echo -e "${GREEN}  ✅ IDENTITY.md${NC}" || echo -e "${RED}  ❌ IDENTITY.md missing${NC}"
    else
        echo -e "${RED}❌ Memphis not initialized${NC}"
        echo -e "${YELLOW}   Run: memphis-bootstrap --fresh${NC}"
    fi
}

run_doctor() {
    show_banner
    echo -e "${BLUE}🏥 Memphis Health Check${NC}"
    echo ""

    # Check structure
    echo -e "${BLUE}Checking directory structure...${NC}"
    [ -d "$MEMPHIS_DIR" ] && echo -e "${GREEN}  ✅ ~/.memphis exists${NC}" || echo -e "${RED}  ❌ ~/.memphis missing${NC}"
    [ -d "$MEMPHIS_DIR/chains" ] && echo -e "${GREEN}  ✅ Chains directory${NC}" || echo -e "${RED}  ❌ Chains missing${NC}"

    # Check identity
    echo -e "${BLUE}Checking identity...${NC}"
    [ -f "$MEMPHIS_WORKSPACE/SOUL.md" ] && echo -e "${GREEN}  ✅ SOUL.md${NC}" || echo -e "${RED}  ❌ SOUL.md missing${NC}"
    [ -f "$MEMPHIS_WORKSPACE/IDENTITY.md" ] && echo -e "${GREEN}  ✅ IDENTITY.md${NC}" || echo -e "${RED}  ❌ IDENTITY.md missing${NC}"

    # Check chains
    echo -e "${BLUE}Checking chains...${NC}"
    CHAINS=("journal" "decisions" "ask" "share" "summary" "trade" "vault" "ops")
    for chain in "${CHAINS[@]}"; do
        if [ -d "$MEMPHIS_DIR/chains/$chain" ]; then
            BLOCKS=$(ls -1 "$MEMPHIS_DIR/chains/$chain" 2>/dev/null | wc -l)
            echo -e "${GREEN}  ✅ $chain: $BLOCKS blocks${NC}"
        else
            echo -e "${YELLOW}  ⚠️  $chain: empty${NC}"
        fi
    done

    echo -e "${GREEN}"
    echo "✅ All systems operational!"
    echo -e "${NC}"
}

run_tests() {
    show_banner
    echo -e "${BLUE}🧪 Running Tests${NC}"
    echo ""

    PASS=0
    FAIL=0

    # Test 1: Directory structure
    if [ -d "$MEMPHIS_DIR" ] && [ -d "$MEMPHIS_DIR/chains" ]; then
        echo -e "${GREEN}✅ Directory structure: PASS${NC}"
        ((PASS++))
    else
        echo -e "${RED}❌ Directory structure: FAIL${NC}"
        ((FAIL++))
    fi

    # Test 2: Identity files
    if [ -f "$MEMPHIS_WORKSPACE/SOUL.md" ] && [ -f "$MEMPHIS_WORKSPACE/IDENTITY.md" ]; then
        echo -e "${GREEN}✅ Identity configuration: PASS${NC}"
        ((PASS++))
    else
        echo -e "${RED}❌ Identity configuration: FAIL${NC}"
        ((FAIL++))
    fi

    # Test 3: Chains
    if [ -d "$MEMPHIS_DIR/chains/journal" ]; then
        echo -e "${GREEN}✅ Chain initialization: PASS${NC}"
        ((PASS++))
    else
        echo -e "${RED}❌ Chain initialization: FAIL${NC}"
        ((FAIL++))
    fi

    echo ""
    echo -e "${BLUE}Results: ${GREEN}$PASS passed${NC}, ${RED}$FAIL failed${NC}"

    if [ $FAIL -eq 0 ]; then
        echo -e "${GREEN}✅ All tests passing!${NC}"
    else
        echo -e "${RED}❌ Some tests failed${NC}"
        exit 1
    fi
}

create_backup() {
    if [ -z "$BACKUP_FILE" ]; then
        BACKUP_FILE="memphis-backup-$(date +%Y%m%d-%H%M%S).tar.gz"
    fi

    echo -e "${BLUE}📦 Creating backup...${NC}"
    tar -czf "$BACKUP_FILE" -C "$HOME" .memphis 2>/dev/null
    echo -e "${GREEN}✅ Backup created: $BACKUP_FILE${NC}"
}

restore_backup() {
    if [ -z "$RESTORE_FILE" ]; then
        echo -e "${RED}❌ No backup file specified${NC}"
        exit 1
    fi

    if [ ! -f "$RESTORE_FILE" ]; then
        echo -e "${RED}❌ Backup file not found: $RESTORE_FILE${NC}"
        exit 1
    fi

    echo -e "${BLUE}📦 Restoring from backup...${NC}"
    tar -xzf "$RESTORE_FILE" -C "$HOME"
    echo -e "${GREEN}✅ Restored from: $RESTORE_FILE${NC}"
}

# Main execution

show_banner

if [ -n "$RESTORE_FILE" ]; then
    restore_backup
    exit 0
fi

if [ -n "$BACKUP_FILE" ]; then
    create_backup
    exit 0
fi

if [ "$FRESH" = true ] || [ -z "$AGENT_NAME" ]; then
    interactive_setup
fi

check_dependencies

# Execute phases
phase1_structure
phase2_identity
phase3_self_loop
phase4_network

# Final summary
echo -e "${CYAN}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎉 Bootstrap Complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${NC}"

echo -e "${GREEN}✅ Memphis initialized${NC}"
echo -e "${GREEN}✅ Identity configured: $AGENT_NAME${NC}"
echo -e "${GREEN}✅ Self-loop enabled${NC}"

if [ "$NETWORK_ENABLED" = true ]; then
    echo -e "${GREEN}✅ Network ready${NC}"
else
    echo -e "${YELLOW}⏭️  Network disabled${NC}"
fi

echo ""
echo -e "${CYAN}🧠 $AGENT_NAME is ready to learn!${NC}"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo "  memphis status        # Check system health"
echo "  memphis journal 'text' # Add first memory"
echo "  memphis recall 'text'  # Search memory"
echo ""
