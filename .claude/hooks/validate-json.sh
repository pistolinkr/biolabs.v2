#!/bin/bash
# PostToolUse(Edit|Write, *.json) — i18n/설정 JSON 문법 자동 검증
set -uo pipefail
INPUT=$(cat)
FILE=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

[[ "$FILE" == *.json ]] || exit 0
[[ -f "$FILE" ]] || exit 0

if ! python3 -c "import json; json.load(open('$FILE'))" 2>/tmp/biolabs3-json-error; then
  ERR=$(cat /tmp/biolabs3-json-error)
  jq -n --arg reason "JSON 문법 오류: $ERR" '{
    hookSpecificOutput: {
      hookEventName: "PostToolUse",
      additionalContext: ("⚠ 방금 쓴 JSON이 깨졌다: " + $reason + " — 되돌리거나 고쳐라.")
    }
  }'
fi
exit 0
