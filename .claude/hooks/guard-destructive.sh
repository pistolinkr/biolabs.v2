#!/bin/bash
# PreToolUse(Bash) — CHARTER 4조 절대금지 명령 차단. LLM 판단 없이 결정론적으로.
set -uo pipefail
INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty')

deny() {
  jq -n --arg reason "$1" '{
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: $reason
    }
  }'
  exit 0
}

case "$COMMAND" in
  *"git push"*"--force"*|*"git push -f"*)
    deny "CHARTER 4조: force push 금지" ;;
  *"git reset --hard"*)
    deny "CHARTER 4조: git reset --hard 금지" ;;
  *"git branch -D"*origin*|*"git push"*"--delete"*|*"git tag -d"*)
    deny "CHARTER 4조: 브랜치/태그 삭제 금지" ;;
  *"rm -rf"*)
    deny "파괴적 삭제 명령 차단 — 필요하면 사장에게 질의" ;;
  *"pnpm add"*"@latest"*|*"pnpm up --latest"*|*"npm install"*"@latest"*)
    deny "CHARTER 4조: 의존성 메이저 업그레이드 금지" ;;
  *"pnpm install"*"--force"*"lockfile"*|*"rm"*"pnpm-lock.yaml"*)
    deny "CHARTER 4조: 락파일 재생성 금지" ;;
  *"vercel --prod"*|*"deploy"*"--prod"*|*"render deploy"*)
    deny "CHARTER 4조: 프로덕션 배포 트리거 금지 — 사장 결재 필요" ;;
esac

exit 0
