#!/bin/bash
# check-messages-daemon.sh — Background daemon to check for new messages
# Usage: ./check-messages-daemon.sh [--install|--start|--stop|--status]
# Created: 2026-03-02 21:10 CET

set -e

MEMPHIS_DIR="$HOME/memphis"
LOG_FILE="$MEMPHIS_DIR/messages/daemon.log"
PID_FILE="$MEMPHIS_DIR/messages/daemon.pid"
SCRIPT="$MEMPHIS_DIR/receive-messages.sh"
CRON_JOB="*/5 * * * * $MEMPHIS_DIR/receive-messages.sh --daemon >> $LOG_FILE 2>&1"

COMMAND="${1:---status}"

case "$COMMAND" in
    --install)
        echo "🔧 Installing message daemon..."
        # Add cron job
        (crontab -l 2>/dev/null | grep -v "receive-messages.sh"; echo "$CRON_JOB") | crontab -
        echo "✅ Cron job installed (every 5 minutes)"
        echo "📝 Log file: $LOG_FILE"
        ;;

    --uninstall)
        echo "🗑️  Uninstalling message daemon..."
        crontab -l 2>/dev/null | grep -v "receive-messages.sh" | crontab -
        echo "✅ Cron job removed"
        ;;

    --start)
        echo "🚀 Starting daemon (immediate check)..."
        "$SCRIPT" --daemon
        echo "✅ Daemon will auto-check every 5 minutes"
        ;;

    --stop)
        echo "⏹️  Stopping daemon..."
        crontab -l 2>/dev/null | grep -v "receive-messages.sh" | crontab -
        echo "✅ Daemon stopped"
        ;;

    --status)
        echo "📊 DAEMON STATUS"
        echo "================"

        if crontab -l 2>/dev/null | grep -q "receive-messages.sh"; then
            echo "✅ Status: RUNNING"
            echo "📝 Schedule: Every 5 minutes"
            crontab -l | grep "receive-messages.sh"
        else
            echo "❌ Status: NOT RUNNING"
            echo "💡 Install with: $0 --install"
        fi

        if [ -f "$LOG_FILE" ]; then
            echo ""
            echo "📄 Recent log entries:"
            tail -10 "$LOG_FILE"
        fi
        ;;

    --log)
        if [ -f "$LOG_FILE" ]; then
            echo "📄 MESSAGE DAEMON LOG"
            echo "====================="
            tail -50 "$LOG_FILE"
        else
            echo "❌ No log file found"
        fi
        ;;

    *)
        echo "Usage: $0 {--install|--uninstall|--start|--stop|--status|--log}"
        echo ""
        echo "Commands:"
        echo "  --install    Install cron job (auto-check every 5 min)"
        echo "  --uninstall  Remove cron job"
        echo "  --start      Check for messages now"
        echo "  --stop       Stop auto-check"
        echo "  --status     Check if daemon is running"
        echo "  --log        View daemon log"
        ;;
esac
