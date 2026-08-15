#!/bin/bash
# Stop — 턴 종료마다 근거를 남긴다. (SubagentStop에도 동일 스크립트 재사용)
set -uo pipefail
INPUT=$(cat)
TODAY=$(date +%F)
LOG="$HOME/Pistolinkr/!!!biolabs3/company/logs/$TODAY-events.log"
mkdir -p "$(dirname "$LOG")"
EVENT=$(echo "$INPUT" | jq -r '.hook_event_name // "Stop"')
AGENT=$(echo "$INPUT" | jq -r '.agent_name // "main"')
echo "$(date -Iseconds) $EVENT agent=$AGENT" >> "$LOG"
exit 0
