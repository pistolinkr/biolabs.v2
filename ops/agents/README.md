# biolabs3 에이전트 회사

AI 에이전트 4명이 평일 09:00에 출근해 18:00에 퇴근하며 biolabs를 v3로 끌고 가는 구조.

## 누가 어디서 도는가

```
        08:45  Cowork Claude (클라우드)  ──▶ plans/YYYY-MM-DD.md   [작업지시서]
                                                    │
        09:00  Orca automation (맥)      ──▶ 코디레이터 (Claude Code)
                                                    │  worktree 4개로 분기
                          ┌──────────┬──────────┬──────────┐
                          ▼          ▼          ▼          ▼
                         PM       리뷰어       QA        SRE
                          └──────────┴──────────┴──────────┘
                                     │  worker_done 수거
        18:00  Orca automation (맥)  ──▶ reports/YYYY-MM-DD.md  [일일보고서]
                                                    │
        18:30  Cowork Claude (클라우드) ──▶ 사장에게 채팅 보고
```

Orca는 **맥에서** 돌고 Cowork Claude는 **클라우드에서** 돈다. 둘은 이 리포 폴더를 통해 파일로 대화한다.
맥이 꺼져 있으면 워커는 안 돌고, 지시서·보고 요약만 남는다.

## 파일 지도

| 경로 | 용도 |
|---|---|
| `CHARTER.md` | 사규. 모든 워커가 작업 전 읽는다 |
| `roles/*.md` | 직무기술서 4종 |
| `prompts/coordinator.md` | 09:00 자동화가 먹는 프롬프트 |
| `prompts/closing.md` | 18:00 자동화가 먹는 프롬프트 |
| `plans/backlog.md` | 우선순위 큐 (지시서 없을 때 폴백) |
| `plans/YYYY-MM-DD.md` | 그날의 작업지시서 |
| `reports/YYYY-MM-DD.md` | 그날의 일일보고서 |
| `setup.sh` | Orca automations 생성 |

## 설치 (한 번만)

```bash
# 1. Orca 설치 후 앱 실행 → Settings → Experimental → Orchestration 켜기
orca status --json          # 성공해야 함

# 2. 오케스트레이션 스킬 설치 (에이전트가 CLI를 알게)
orca skills install orchestration
orca skills install orca-cli

# 3. 자동화 생성 (disabled 상태로)
bash ops/agents/setup.sh --apply

# 4. 리허설 후 활성화
orca automations list --json
orca automations run <id> --json
orca automations edit <id> --enabled --json
```

## 규칙 요약

- 브랜치: `claude/workers/v3/<YYYYMMDD>-<role>-<slug>`
- `main` 직접 커밋 금지, PR까지만
- 버전은 v3.0.0부터, 올리는 건 PM만
- 역할당 하루 PR 2개 상한
- `pnpm check` + `pnpm test` + `pnpm build` 통과 못 하면 PR 금지
