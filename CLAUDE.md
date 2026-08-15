# biolabs3 — 프로젝트 규칙

이 문서는 모든 에이전트(Engineering Lead 세션, subagent 전부)가 작업 전 로드한다. 여기 없는 권한은 없는 것으로 간주한다.

## 정체성
`biolabs3` = AI 에이전트에게 맡긴 차세대 biolabs. 버전은 v3.0.0부터. v2.x는 사람이 만든 세대.

## 조직 구조

**Department: Engineering** — Role은 판단하고, Worker는 실행한다. 이 둘을 혼동하지 마라.

```
Engineering Lead (main session — agent 파일 없음)
├── technical-investigator   조사·RCA·해결계획   → repo-scan / doc-lookup / dependency-check worker
├── security-reviewer        무엇을 만들면 안 되는가 (조건부 호출, BLOCK 권한)
├── product-engineer         승인된 계획의 구현
├── evaluation-engineer      독립 검증·수용기준 판정  → design-conformance worker
└── recovery-engineer        멈춘 workflow 복구 (이상 시에만)
```

Role 정의는 `.claude/agents/roles/`, Worker는 `.claude/agents/workers/`,
workflow는 `.claude/skills/*/SKILL.md`, 설정값(depth·routing·timeout·retry·model)은
`$BIOLABS3_SHARED/config/engineering-org.yaml`이 **단일 출처**다. 이 파일에 중복 기술하지 않는다.

**모든 이슈가 모든 Role을 부르지 않는다.** `role_routing`이 이슈의 category·affected_files·depth_signal·severity를
보고 필요한 Role만 호출한다. P3/P4는 investigation 자체를 생략한다.

**dormant**: `ops/agents/roles/pm.md`(제품 방향), `sre.md`(배포 모니터링) — 자동 루프에 없음, 필요 시 사람이 호출.
**만들지 않은 것과 근거**: Research Engineer / Architect / Product Designer / Platform Engineer —
`engineering-org.yaml`의 `organization.not_created` 참조.

트리거는 Claude Code 바깥(macOS launchd)에 있다 — Claude Code 자체엔 스케줄 기능이 없다(2026-08-13 공식 문서 확인).
`$BIOLABS3_SHARED/bin/run-agent.sh`가 09:00 `/engineering-audit`, 11:00 `/reconcile`→`/investigate`→`/remediate`→`/evaluate`→`/reinspect`를 헤드리스로 돈다.


## 경로 계약 (중요)

에이전트는 **격리 git 워크트리** 안에서 실행된다(`~/orca/workspaces/biolabs/cron-*`).
그 워크트리는 실행이 끝나면 삭제된다. **거기 쓴 파일은 전부 사라진다.**

공용 폴더는 워크트리 밖에 있고, 상대경로로는 절대 안 잡힌다:

| 환경변수 | 값 |
|---|---|
| `$BIOLABS3_SHARED` | 공용 사무실 (설정·이슈·보고서·로그) |
| `$BIOLABS3_REPO` | 원본 리포 (영속) |
| `$BIOLABS3_WORKTREE` | 현재 워크트리 (휘발성) |

`run-agent.sh`가 이 값들을 export하고 프롬프트 헤더로도 전달한다.
**`company/...` 같은 상대경로를 쓰지 마라.** 경로를 찾아 헤매는 순간 그 실행은 이미 잘못됐다.
(근거: ISSUE-20260813-03 — 2회 연속 이 문제로 1단계에서 막혔고, 최악의 경우 산출물이
워크트리와 함께 삭제되고도 exit=0으로 "성공" 처리될 수 있었다.)

## 브랜치 규칙 (엄수)

```
claude/workers/v3.<MINOR>.<PATCH>
예) claude/workers/v3.1.1, claude/workers/v3.1.2, claude/workers/v3.1.3
```

**브랜치 이름에 슬러그·날짜·설명을 넣지 마라.** 버전 번호만 쓴다.
이유: 브랜치 목록 UI에서 이름이 잘려서 결국 구분이 안 된다. 무엇을 바꿨는지는
**커밋 메시지와 PR 본문이 설명한다** — 그게 그것들의 존재 이유다.

브랜치 이름은 직접 짓지 말고 반드시 이 명령으로 받아라:

```bash
BRANCH="$(zsh "$BIOLABS3_SHARED/bin/next-branch.sh")"
git checkout -b "$BRANCH"
```

- PATCH는 원격의 같은 MINOR 대 최대값 +1로 자동 계산된다. 손으로 세지 마라.
- MINOR(`3.1` → `3.2`)는 사람만 올린다: `$BIOLABS3_SHARED/config/branch-version.txt`.
- push 시 이름이 이미 있으면(동시 실행 충돌) 스크립트를 다시 돌려 새 번호를 받아라. 강제로 덮어쓰지 마라.
- `release/vN.N` 규칙 폐기. `main` 직접 커밋·푸시 금지, 예외 없음.
- 산출물은 PR까지. merge는 사람이 한다.

### 커밋과 PR은 반드시 영어로 (예외 없음)

커밋 메시지, PR 제목, PR 본문 — **전부 영어.** 한국어를 섞지 마라.

```
commit: <type>: <what changed, imperative mood>
PR title: [v3.1.2] <what changed>
```

PR 본문에 반드시 포함: why / what was verified / risk / how to revert.

### 커밋 트레일러 (필수)

에이전트가 만드는 **모든 커밋**의 마지막 줄에 반드시 넣는다:

```
Co-authored-by: Claude <noreply@anthropic.com>
```

- 본문과 트레일러 사이에 빈 줄 하나. 트레일러 뒤엔 아무것도 쓰지 않는다.
- 이 주소는 GitHub 계정에 연결돼 있지 않다. **의도된 것이다** — 소유하지 않은 계정으로 커밋하지 않는다.
  Contributors 사이드바에는 안 잡히지만 `git log`와 각 커밋 페이지에는 영구히 남는다.
- 다른 사람·다른 봇의 이메일을 author나 트레일러에 쓰지 마라. 사칭이다.
- `git commit --author=...`로 author를 바꾸지 마라. author는 실행 주체의 git 설정 그대로 둔다.

배경과 조직 구성은 `CONTRIBUTORS.md` 참조.

**한국어를 쓰는 곳은 따로 있다** — 이슈 YAML, 보고서(`reports/`), 로그는 한국어로 쓴다.
그건 사장이 읽는 내부 문서고, 커밋·PR은 저장소 이력이라 영어로 남긴다.

## 버전
`package.json`의 `version`은 사람 또는 명시적 위임 시에만 올린다. 워커는 건드리지 않는다.

## 절대 금지 (Hook `guard-destructive.sh`가 결정론적으로도 강제)
- `.env`, 시크릿·토큰을 커밋하거나 로그·PR·보고서에 출력
- `git push --force`, `git reset --hard`(원격 대상), 브랜치·태그 삭제
- 의존성 메이저 업그레이드, 락파일 통째 재생성
- DB 마이그레이션 실행, 프로덕션 배포 트리거
- 100줄 넘는 삭제가 포함된 변경 → 제안만 하고 `state: BLOCKED`로 결재 요청

## 하루 산출량 상한
역할당 PR 최대 2개(`/remediate` 스킬이 강제). 더 있으면 다음 이슈로 이월.

## 품질 게이트
```
pnpm check && pnpm test && pnpm build
```
Product Engineer가 로컬에서 통과 확인 → Evaluation Engineer가 독립적으로 재실행해서 최종 판정.
**구현자의 자기 판정은 최종 판정이 아니다.**

## 리포 특성
Vite + React + TS 프론트(`client/`), Express 서버(`server/`), 공용 타입(`shared/`).
`shared/` 변경 시 양쪽 다 확인. i18n은 `client/src/locales/<lang>/*.json` —
키 추가 시 모든 언어 파일에 반영(누락은 반복 발생 패턴으로 이미 확인됨, `$BIOLABS3_SHARED/issues/ISSUE-20260813-01.yaml` 참조).

## 이력 / 폐기된 설계
- `ops/agents/`(pm/reviewer/qa/sre + Orca coordinator 체제) — 2026-08-13 설계, 실행된 적 없음(git 이력·리포 어디서도 참조 0건 확인). 폐기 사유와 캡ability 이관처는 `ops/agents/DEPRECATED.md` 참조.
- Orca Automation — 프롬프트를 입력창에 넣고 Enter를 보내지 않는 버그를 수동/예약 양쪽에서 재현 확인(2026-08-13). launchd로 대체.
