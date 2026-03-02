#!/bin/bash
# enhance-model-b.sh — Enhance Model B inference with deeper git analysis
# Created: 2026-03-02 20:26 CET
# Usage: ./enhance-model-b.sh

set -e

cd ~/memphis

echo "🧠 MODEL B ENHANCEMENT"
echo "====================="
echo ""

# Check git status
if [ ! -d .git ]; then
    echo "❌ ERROR: Not a git repository!"
    exit 1
fi

TOTAL_COMMITS=$(git log --oneline --all | wc -l)
echo "Git commits available: $TOTAL_COMMITS"
echo ""

# ENHANCEMENT 1: Extended time range analysis
echo "📊 ENHANCEMENT 1: Extended Time Range (30 days)"
echo "================================================"

echo "Running inference with 30-day range, threshold 0.4..."
node dist/cli/index.js infer --since 30 --threshold 0.4 --json > /tmp/inferred-30d.json 2>&1 || true

INFERRED_30D=$(cat /tmp/inferred-30d.json | grep -c '"hash"' || echo "0")
echo "✅ Inferred decisions (30d): $INFERRED_30D"
echo ""

# ENHANCEMENT 2: Author-based analysis
echo "👤 ENHANCEMENT 2: Author-Based Analysis"
echo "========================================"

AUTHORS=$(git log --format='%aN' | sort -u)
AUTHOR_COUNT=$(echo "$AUTHORS" | wc -l)

echo "Found $AUTHOR_COUNT authors"
echo ""

for author in $AUTHORS; do
    COMMIT_COUNT=$(git log --author="$author" --oneline | wc -l)

    if [ $COMMIT_COUNT -gt 5 ]; then
        CONF=$(echo "scale=2; 0.5 + $COMMIT_COUNT / 100" | bc)
        if [ $(echo "$CONF > 0.9" | bc) -eq 1 ]; then
            CONF=0.9
        fi

        node dist/cli/index.js decision "Author pattern: $author has $COMMIT_COUNT commits" --confidence $CONF --tags inferred,git,author-analysis 2>&1 | grep -v DEBUG
    fi
done

echo "✅ Author analysis complete"
echo ""

# ENHANCEMENT 3: File-based patterns
echo "📁 ENHANCEMENT 3: File-Based Patterns"
echo "======================================"

# Find frequently modified files
HOT_FILES=$(git log --name-only --pretty=format: --since="30 days ago" | grep -v '^$' | sort | uniq -c | sort -rn | head -10)

echo "Most modified files:"
echo "$HOT_FILES"
echo ""

COUNT=0
while read -r line; do
    if [ -n "$line" ]; then
        FILE=$(echo "$line" | awk '{print $2}')
        MODS=$(echo "$line" | awk '{print $1}')

        if [ $MODS -gt 3 ]; then
            CONF=$(echo "scale=2; 0.6 + $MODS / 20" | bc)
            if [ $(echo "$CONF > 0.85" | bc) -eq 1 ]; then
                CONF=0.85
            fi

            node dist/cli/index.js decision "Hot file: $FILE modified $MODS times" --confidence $CONF --tags inferred,git,file-pattern 2>&1 | grep -v DEBUG
            COUNT=$((COUNT + 1))
        fi
    fi
done <<< "$HOT_FILES"

echo "✅ Added $COUNT file-based decisions"
echo ""

# ENHANCEMENT 4: Time-based patterns
echo "⏰ ENHANCEMENT 4: Time-Based Patterns"
echo "====================================="

# Analyze commit times
COMMITS_BY_HOUR=$(git log --format='%ad' --date=format:'%H' | sort | uniq -c | sort -rn | head -5)

echo "Most active hours:"
echo "$COMMITS_BY_HOUR"
echo ""

PEAK_HOUR=$(echo "$COMMITS_BY_HOUR" | head -1 | awk '{print $2}')
PEAK_COUNT=$(echo "$COMMITS_BY_HOUR" | head -1 | awk '{print $1}')

node dist/cli/index.js decision "Peak productivity: $PEAK_HOUR:00 ($PEAK_COUNT commits)" --confidence 0.8 --tags inferred,git,time-pattern 2>&1 | grep -v DEBUG

echo "✅ Time analysis complete"
echo ""

# ENHANCEMENT 5: Semantic commit analysis
echo "🎯 ENHANCEMENT 5: Semantic Commit Analysis"
echo "=========================================="

# Count conventional commit types
FEAT_COUNT=$(git log --oneline --grep="feat" | wc -l)
FIX_COUNT=$(git log --oneline --grep="fix" | wc -l)
DOCS_COUNT=$(git log --oneline --grep="docs" | wc -l)
REFACTOR_COUNT=$(git log --oneline --grep="refactor" | wc -l)

echo "Commit type distribution:"
echo "  feat: $FEAT_COUNT"
echo "  fix: $FIX_COUNT"
echo "  docs: $DOCS_COUNT"
echo "  refactor: $REFACTOR_COUNT"
echo ""

if [ $FEAT_COUNT -gt 10 ]; then
    node dist/cli/index.js decision "Active feature development: $FEAT_COUNT features" --confidence 0.85 --tags inferred,git,feature-focus 2>&1 | grep -v DEBUG
fi

if [ $FIX_COUNT -gt 5 ]; then
    node dist/cli/index.js decision "Bug fixing active: $FIX_COUNT fixes" --confidence 0.75 --tags inferred,git,maintenance 2>&1 | grep -v DEBUG
fi

if [ $DOCS_COUNT -gt 5 ]; then
    node dist/cli/index.js decision "Documentation priority: $DOCS_COUNT doc updates" --confidence 0.8 --tags inferred,git,documentation 2>&1 | grep -v DEBUG
fi

echo "✅ Semantic analysis complete"
echo ""

# Summary
echo "📊 ENHANCEMENT SUMMARY"
echo "======================"
echo ""
echo "Inferred decisions added:"
echo "  - Extended range: $INFERRED_30D"
echo "  - Author patterns: $AUTHOR_COUNT authors analyzed"
echo "  - File patterns: $COUNT hot files"
echo "  - Time patterns: 1 peak hour identified"
echo "  - Semantic patterns: Conventional commits analyzed"
echo ""

TOTAL_DECISIONS=$(ls ~/.memphis/chains/decisions/*.json 2>/dev/null | wc -l || echo "0")
echo "Total decisions in chain: $TOTAL_DECISIONS"
echo ""

echo "🎯 NEXT STEPS:"
echo "1. Review inferred decisions: memphis status"
echo "2. Train Model C with new data: ./train-model-c-advanced.sh"
echo "3. Test predictions: memphis predict"
