#!/usr/bin/env bash
# biolabs3 에이전트 회사 — 최초 1회 부트스트랩
#
#   cd ~/Pistolinkr/!!!biolabs3/biolabs
#   bash ops/agents/bootstrap.sh
#
# 하는 일: 사규 파일 커밋/푸시 → Orca 스킬 설치 → base ref 고정 → 자동화 2개 생성(비활성)
# 안 하는 일: 자동화 활성화(직접 리허설 후), main에 다른 변경 커밋

set -uo pipefail
BOLD=$'\033[1m'; RED=$'\033[31m'; GRN=$'\033[32m'; YEL=$'\033[33m'; OFF=$'\033[0m'
step() { echo; echo "${BOLD}▶ $*${OFF}"; }
ok()   { echo "  ${GRN}✓${OFF} $*"; }
warn() { echo "  ${YEL}!${OFF} $*"; }
die()  { echo "  ${RED}✗${OFF} $*"; exit 1; }
ask()  { read -r -p "  → $1 [y/N] " a; [[ "$a" == "y" || "$a" == "Y" ]]; }

TZ_NAME="${ORCA_TZ:-Asia/Seoul}"

# ── 0. 사전 점검 ──────────────────────────────────────────────
step "0/5  사전 점검"
git rev-parse --is-inside-work-tree >/dev/null 2>&1 || die "git 리포 안에서 실행하세요."
cd "$(git rev-parse --show-toplevel)"
[[ -f ops/agents/CHARTER.md ]] || die "ops/agents/CHARTER.md 없음. 리포 루트에서 실행 중인지 확인."
ok "리포: $(pwd)"

command -v orca >/dev/null 2>&1 \
  || die "orca CLI 없음 → Orca 앱 Settings → Experimental → CLI 에서 등록 후 새 터미널로 재시도"
ok "orca CLI: $(command -v orca)"

orca status --json >/dev/null 2>&1 || {
  warn "Orca 런타임 미기동 — 여는 중..."
  orca open --json >/dev/null 2>&1 || true
  sleep 3
}
orca status --json >/dev/null 2>&1 || die "Orca 런타임에 연결 실패. 앱을 켜고 다시 실행."
ok "Orca 런타임 응답"

echo
echo "  ${YEL}확인 필요:${OFF} Orca → Settings → Experimental → ${BOLD}Orchestration${OFF} 이 켜져 있어야 합니다."
ask "켜져 있습니까?" || die "먼저 켜고 다시 실행하세요."

# ── 1. 사규 파일 커밋 (이게 없으면 워크트리가 텅 빔) ──────────
step "1/5  사규 파일을 git에 올리기"
if git ls-files --error-unmatch ops/agents/CHARTER.md >/dev/null 2>&1; then
  ok "이미 추적 중 — 건너뜀"
else
  OTHERS=$(git status --porcelain | grep -vc '^?? ops/' || true)
  warn "ops/ 외에 미커밋 변경 ${OTHERS}건이 있습니다. ${BOLD}그건 건드리지 않고 ops/agents/ 만${OFF} 커밋합니다."
  git status --short ops/agents | sed 's/^/    /'
  if ask "ops/agents/ 를 main에 커밋할까요?"; then
    git add ops/agents
    git commit -m "chore(v3): AI 에이전트 회사 사규·직무기술서·자동화 셋업

- ops/agents/CHARTER.md: 브랜치 claude/workers/v3/*, main 직접커밋 금지, PR까지만
- ops/agents/roles/: PM·리뷰어·QA·SRE 직무기술서
- ops/agents/prompts/: 09:00 코디네이터 / 18:00 퇴근보고 프롬프트
- 버전 v3.0.0부터 (AI 세대)"
    ok "커밋 완료"
    if ask "origin/main 에 푸시할까요? (워크트리가 origin 기준으로 갈라지므로 권장)"; then
      git push origin main && ok "푸시 완료"
    else
      warn "미푸시 — 워크트리 base ref를 로컬 main으로 맞춰야 합니다"
    fi
  else
    die "커밋 없이는 워커 워크트리에 사규가 안 들어갑니다. 중단."
  fi
fi

# ── 2. Orca 스킬 설치 ────────────────────────────────────────
step "2/5  Orca 스킬 설치 (에이전트가 orca 명령을 알게)"
orca skills install --skill orca-cli --skill orchestration 2>&1 | sed 's/^/    /' \
  || warn "스킬 설치 실패 — 수동: npx skills add https://github.com/stablyai/orca --skill orchestration --global"
ok "스킬 설치 시도 완료"

# ── 3. 리포 등록 + base ref ──────────────────────────────────
step "3/5  리포 등록 & base ref 고정"
orca repo add --path "$(pwd)" --json >/dev/null 2>&1 || true
REPO_ID=$(orca repo list --json 2>/dev/null \
  | grep -o '"id":"[^"]*"[^}]*biolabs' | head -1 | sed 's/"id":"\([^"]*\)".*/\1/')
if [[ -n "$REPO_ID" ]]; then
  ok "repoId = $REPO_ID"
  orca repo set-base-ref --repo "id:$REPO_ID" --ref origin/main --json >/dev/null 2>&1 \
    && ok "base ref → origin/main"
  SEL="id:$REPO_ID"
else
  warn "repoId 자동 추출 실패 — 이름으로 진행"
  SEL="biolabs"
fi

# ── 4. 자동화 생성 (비활성) ──────────────────────────────────
step "4/5  자동화 2개 생성 (--disabled)"
if orca automations list --json 2>/dev/null | grep -q "biolabs3 09:00"; then
  warn "이미 존재 — 건너뜀 (다시 만들려면 orca automations remove 먼저)"
else
  orca automations create \
    --name "biolabs3 09:00 출근" \
    --trigger weekdays --time 09:00 --timezone "$TZ_NAME" \
    --provider claude --repo "$SEL" \
    --precheck "test -f ops/agents/CHARTER.md" \
    --prompt "너는 biolabs3의 코디네이터다. 먼저 ops/agents/CHARTER.md 와 ops/agents/prompts/coordinator.md 를 읽고, coordinator.md 의 절차를 순서대로 그대로 수행하라. 오늘 지시서는 ops/agents/plans/ 아래 오늘 날짜 파일이며 없으면 ops/agents/plans/backlog.md 를 쓴다. 코드를 직접 수정하지 말고 워커를 띄워 위임하라." \
    --disabled --json >/dev/null && ok "09:00 출근 생성"

  orca automations create \
    --name "biolabs3 18:00 퇴근보고" \
    --trigger "0 18 * * 1-5" --timezone "$TZ_NAME" \
    --provider claude --repo "$SEL" \
    --precheck "test -f ops/agents/prompts/closing.md" \
    --prompt "ops/agents/prompts/closing.md 를 읽고 그대로 수행하라. 오늘자 일일보고서를 ops/agents/reports/ 아래 오늘 날짜로 작성하고 claude/workers/v3/<YYYYMMDD>-report 브랜치로 PR을 올려라. 숫자를 지어내지 말고 확인 못 한 항목은 '미확인'으로 남겨라." \
    --disabled --json >/dev/null && ok "18:00 퇴근보고 생성"
fi

# ── 5. 안내 ──────────────────────────────────────────────────
step "5/5  완료 — 다음은 리허설"
orca automations list --json 2>/dev/null | sed 's/^/    /' | head -30
cat <<'TIP'

  ┌─ 리허설 (반드시 눈으로 보면서) ───────────────────────────┐
  │  orca automations list --json          # ID 확인          │
  │  orca automations run <09시ID> --json  # 지금 한 번 실행  │
  │  ...워커 4개가 뜨는지 Orca 창에서 확인...                 │
  │  orca automations runs --id <09시ID> --json               │
  │                                                            │
  │  괜찮으면 활성화:                                          │
  │  orca automations edit <09시ID> --enabled --json           │
  │  orca automations edit <18시ID> --enabled --json           │
  └────────────────────────────────────────────────────────────┘

  Cowork 쪽(08:45 지시서 / 18:30 보고)은 이미 켜져 있습니다.
  맥이 켜져 있고 Orca가 떠 있어야 09:00 자동화가 돕니다.
TIP
