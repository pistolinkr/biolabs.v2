#!/bin/bash
# PostToolUseFailure — 실패를 분류해서 기록만 한다. retry 여부 결정은 recovery-engineer(스킬 reconcile) 몫.
set -uo pipefail
INPUT=$(cat)
TODAY=$(date +%F)
LOG="$HOME/Pistolinkr/!!!biolabs3/company/logs/$TODAY-failures.log"
mkdir -p "$(dirname "$LOG")"
TOOL=$(echo "$INPUT" | jq -r '.tool_name // "unknown"')
ERROR=$(echo "$INPUT" | jq -r '.error // .tool_response.error // "unknown"' | head -c 500)
echo "$(date -Iseconds) tool=$TOOL error=$ERROR" >> "$LOG"
exit 0
