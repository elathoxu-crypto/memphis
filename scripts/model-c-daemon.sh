#!/bin/bash
# Memphis Model C Daemon - Background Context Analysis
# 
# Runs every 30 minutes to:
# - Analyze current context
# - Match against learned patterns
# - Show proactive predictions (if confidence >70%)

MEMPHIS_CLI="${MEMPHIS_CLI:-node ~/memphis/dist/cli/index.js}"
LOG_FILE="${LOG_FILE:-~/.memphis/daemon.log}"
INTERVAL="${INTERVAL:-1800}" # 30 minutes

echo "Starting Memphis Model C Daemon..."
echo "Interval: ${INTERVAL}s"
echo "Log: ${LOG_FILE}"
echo ""

while true; do
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] Running context analysis..." >> "${LOG_FILE}"
  
  # Run prediction (no learning, just matching)
  OUTPUT=$(${MEMPHIS_CLI} predict 2>&1)
  
  # Check if predictions found
  if echo "${OUTPUT}" | grep -q "No predictions"; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] No predictions" >> "${LOG_FILE}"
  else
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Predictions found!" >> "${LOG_FILE}"
    echo "${OUTPUT}" >> "${LOG_FILE}"
    
    # TODO: Send notification (desktop, telegram, etc.)
    # For now, just log it
  fi
  
  # Re-learn patterns once per day (at midnight)
  CURRENT_HOUR=$(date +%H)
  CURRENT_MINUTE=$(date +%M)
  
  if [ "${CURRENT_HOUR}" = "00" ] && [ "${CURRENT_MINUTE}" -lt "30" ]; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Daily pattern learning..." >> "${LOG_FILE}"
    ${MEMPHIS_CLI} predict --learn --since 30 >> "${LOG_FILE}" 2>&1
  fi
  
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] Sleeping for ${INTERVAL}s..." >> "${LOG_FILE}"
  sleep ${INTERVAL}
done
