#!/usr/bin/env bash
# biolabs3 에이전트 회사 — Orca 자동화 셋업
# 사용법:  bash ops/agents/setup.sh          (미리보기: 명령만 출력)
#          bash ops/agents/setup.sh --apply  (실제 생성, 단 --disabled 상태)
set -euo pipefail

REPO="${ORCA_REPO:-biolabs}"
TZ_NAME="${ORCA_TZ:-Asia/Seoul}"
APPLY="${1:-}"

run() {
  if [[ "$APPLY" == "--apply" ]]; then
    echo "▶ $*" >&2
    "$@"
  else
    printf '%q ' "$@"; echo
  fi
}

echo "== 사전 점검 ==" >&2
if ! command -v orca >/dev/null 2>&1; then
  echo "✗ orca CLI 없음. https://www.onorca.dev/download 에서 설치 후 다시 실행." >&2
  exit 1
fi
orca status --json >/dev/null 2>&1 || {
  echo "✗ Orca 런타임이 안 떠 있음. Orca 앱을 켜고 다시 실행." >&2
  exit 1
}
echo "✓ orca 런타임 OK  (repo=$REPO, tz=$TZ_NAME)" >&2
echo "  ⚠ Settings → Experimental 에서 Orchestration 이 켜져 있어야 함" >&2
echo >&2

# ── 09:00 출근 ────────────────────────────────────────────────
run orca automations create \
  --name "biolabs3 09:00 출근" \
  --trigger weekdays \
  --time 09:00 \
  --timezone "$TZ_NAME" \
  --provider claude \
  --repo "$REPO" \
  --precheck "test -f ops/agents/CHARTER.md" \
  --prompt "너는 biolabs3의 코디네이터다. 먼저 ops/agents/CHARTER.md 와 ops/agents/prompts/coordinator.md 를 읽고, coordinator.md 에 적힌 절차를 순서대로 그대로 수행하라. 오늘 지시서는 ops/agents/plans/\$(date +%F).md 에 있고 없으면 ops/agents/plans/backlog.md 를 쓴다. 코드를 직접 수정하지 말고 워커를 띄워 위임하라." \
  --disabled \
  --json

# ── 18:00 퇴근 ────────────────────────────────────────────────
run orca automations create \
  --name "biolabs3 18:00 퇴근보고" \
  --trigger "0 18 * * 1-5" \
  --timezone "$TZ_NAME" \
  --provider claude \
  --repo "$REPO" \
  --prompt "ops/agents/prompts/closing.md 를 읽고 그대로 수행하라. 오늘자 일일보고서를 ops/agents/reports/\$(date +%F).md 에 작성하고, claude/workers/v3/\$(date +%Y%m%d)-report 브랜치로 PR을 올려라. 숫자를 지어내지 말고 확인 못 한 항목은 '미확인'으로 남겨라." \
  --disabled \
  --json

cat >&2 <<'TIP'

== 다음 단계 ==
  orca automations list --json                     # 생성 확인 + ID 확보
  orca automations run <automationId> --json       # 지금 한 번 돌려보기 (리허설)
  orca automations runs --id <automationId> --json # 결과 확인
  orca automations edit <automationId> --enabled --json   # 만족하면 켜기

리허설 없이 --enabled 하지 말 것. 첫 실행은 반드시 눈으로 지켜본다.
TIP
