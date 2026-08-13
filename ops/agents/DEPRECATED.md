# ops/agents/ — 폐기 (2026-08-13)

이 디렉터리 전체는 신규 Engineering Organization(`.claude/agents/`, `.claude/skills/`,
`company/config/engineering-org.yaml`)으로 대체됐다. 삭제하지 않고 남겨둔 이유는
아래 캡ability mapping 검증 절차(CHARTER 3-D, 3-F 상당)를 지키기 위함이다.

## 삭제 전 참조 검색 결과 (2026-08-13)
```
git log --all --oneline -- ops/agents   → 0 커밋 (이 디렉터리는 한 번도 커밋된 적 없음)
grep -rn "ops/agents|orca orchestration|worker_done|coordinator.md|closing.md" 리포 전체
  → biolabs/ops/agents/ 자기 자신 외 참조 0건
company/bin/run-agent.sh, company/prompts/*.md 참조 → 0건
```
**참조 0건, 의존성 0건.** 그럼에도 즉시 삭제하지 않고 캡ability mapping만 먼저 확정한다.

## Capability Mapping

| Existing Agent | Actual Capability | New Role | Overlap | Unique Capability | Decision |
|---|---|---|---|---|---|
| `roles/qa.md` | check/test/build 게이트, 회귀 테스트 추가, 스냅샷 금지·목킹 룰 | `evaluation-engineer` | 높음 (게이트 로직 동일) | 하우스 룰(스냅샷 금지, 네트워크/시간/랜덤 목킹) | **MERGE** — 하우스 룰을 `evaluation-engineer.md`에 이관 완료 |
| `roles/reviewer.md` | 어제 diff 정독, 가장 아픈 문제 1~2개만 고쳐 PR | `technical-investigator`(발견) + `product-engineer`(구현) | 높음 | 없음 (발견은 audit이, 구현은 remediate가 이미 커버) | **DEPRECATE** — 고유 능력 없음 |
| `roles/pm.md` | `docs/specs/v3/*.md` 작성, backlog 갱신, version 필드 권한 | (해당 없음 — 신규 조직에 미포함) | 없음 | **있음**: 스펙 작성, version 권한은 신규 4단계 루프에 없는 기능 | **KEEP (dormant)** — 필요 시 사람이 직접 호출. 매일 자동 실행 대상 아님(v3 로드맵 결정은 사람 판단 영역) |
| `roles/sre.md` | 배포/로그/메트릭 확인, 5xx 급증 시 에스컬레이션 | (해당 없음 — Platform Engineer 미신설) | 없음 | **있음**: 프로덕션 모니터링. 단, 현재 Render MCP 등 배포 관측 도구 미연결 확인 안 됨 | **KEEP (dormant)** — 배포 모니터링 필요 시점(관측 도구 연결 후)에 Platform Engineer로 승격 검토. 지금 자동 루프에 넣지 않는 이유: 매일 돌 필요·근거 없음(4번 항목 "Do not treat more tokens as automatically better") |
| `prompts/coordinator.md` | Orca 4워커 디스패치, `orca orchestration send` CLI 호출 | `/engineering-audit`, `/investigate`, `/remediate`, `/evaluate` 스킬 체인 | 전체 | 없음 | **DEPRECATE** — `orca orchestration` CLI 자체가 실행된 적 없는 가상의 명령(리포 어디에도 존재 확인 안 됨) |
| `prompts/closing.md` | 일일보고서 작성, `orca orchestration` 기반 취합 | `/reinspect` 스킬 | 전체 | 없음 | **DEPRECATE** |
| `CHARTER.md` | 브랜치 규칙, 절대금지, 품질게이트, PR 상한 | `biolabs/CLAUDE.md` | 전체 (내용 이관 완료) | 없음 | **DEPRECATE** — 규칙 본문은 CLAUDE.md로 이관 완료. 이 파일은 역사적 기록으로만 유지 |

## 삭제 조건 (3-F, 전부 충족해야 삭제)
- [x] 참조 없음
- [x] 활성 workflow 의존성 없음
- [ ] **대체 검증 완료** — `evaluation-engineer`가 실전(evaluate 스킬 실행)에서 최소 1회 검증된 후 체크
- [x] 고유 능력 없음 (pm/sre 제외 — 이 둘은 KEEP)
- [ ] 마이그레이션 완료 — qa 하우스룰 이관은 완료, pm/sre는 이관 대상 아님(dormant 유지)이므로 "완료"의 의미가 다름

**결론: pm.md/sre.md는 삭제하지 않는다(고유 능력 보유). reviewer.md/coordinator.md/closing.md/CHARTER.md는
대체 검증 완료 후(체크박스 완료 시) 삭제 후보.** qa.md는 하우스룰만 이관됐으므로 이관 완료 후 삭제 후보.
지금 시점엔 아무것도 삭제하지 않는다 — HARD RULE 6.

---

## 2026-08-13 2차 개편 후 재평가

`roles/pm.md`, `roles/sre.md`의 **KEEP(dormant) 판정 유지**. 근거를 실측으로 보강했다:
- pm: `company/plans/`가 `.gitkeep`만 있고 비어 있음 — 제품 방향은 사장이 08:48에 직접 결정. 자동화 근거 없음.
- sre: DB·ORM·마이그레이션 미검출, CI는 `build` 1스텝뿐, 배포 관측 도구 미연결. 매일 돌 대상 아님.

두 파일은 `engineering-org.yaml`의 `organization.dormant`에도 등록해 "존재하지만 자동 루프 밖"임을 명시했다.
여전히 **삭제하지 않는다.**
