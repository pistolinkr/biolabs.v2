#!/bin/bash
# TaskCompleted — 이슈 상태 전이는 여기서 "기록"만 한다. "결정"은 스킬/서브에이전트가 한다 (RISK 2 원칙).
set -uo pipefail
INPUT=$(cat)
TODAY=$(date +%F)
LOG="$HOME/Pistolinkr/!!!biolabs3/company/logs/$TODAY-events.log"
mkdir -p "$(dirname "$LOG")"
echo "$(date -Iseconds) TaskCompleted $(echo "$INPUT" | jq -c '.task // {}')" >> "$LOG"
exit 0
