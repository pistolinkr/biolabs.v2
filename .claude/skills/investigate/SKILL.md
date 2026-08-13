---
name: investigate
description: DETECTED/TRIAGED 이슈를 조사해 PLANNED로 만든다. Role routing에 따라 필요한 직무만 호출하는 오케스트레이션 스킬.
---

# Investigate

너는 이 스킬을 실행하는 동안 **Engineering Lead**다. 직접 조사하지 않는다 — 누구를 부를지 정하는 게 네 일이다.

## 1. 대상 선정
`company/issues/*.yaml` 중 `state: DETECTED` 또는 `TRIAGED`. 없으면 즉시 종료(정상).
severity 순, 하루 최대 3건.

## 2. Role Routing (Engineering Lead의 핵심 권한)
`company/config/engineering-org.yaml`의 `role_routing`을 읽고, 이 이슈에 **어떤 Role을 부를지 결정**한다.
- `rules`를 위에서부터 평가. `when_any`의 category / depth_signal / affected_files_match / severity 중 **하나라도** 맞으면 그 rule 적용.
- 여러 rule에 걸리면 roles를 합집합으로 한다 (예: server/core의 보안 이슈 → security + architecture 둘 다).
- 아무것도 안 걸리면 `default`.
- 결정과 근거를 issue yaml의 `routing` 블록에 기록한다:
  ```yaml
  routing:
    matched_rules: []
    roles_invoked: []
    workers_required: []
    reason:
  ```

## 3. Investigation depth 결정
같은 config의 `investigation.depth_signals` 가중치를 합산한다. `depth_4_override_signals`(security_risk / production_impact / data_risk / irreversible_operation) 중 하나라도 해당하면 합산 무시하고 즉시 depth 4.
depth와 그 근거(`depth_reasons`)를 issue에 기록한다. **P0=depth4 같은 단순 매핑을 쓰지 마라.**

## 4. 위임
- `technical-investigator` subagent에게 이슈 id를 넘긴다. depth와 `parallelism_budget`의 `max_workers`를 함께 전달해 worker 남용을 막는다.
- routing에 `security-reviewer`가 포함됐으면, investigator 결과를 받은 뒤 security-reviewer에게도 넘긴다. `verdict: BLOCK`이면 이슈는 `state: BLOCKED` — **네 권한으로 뒤집지 마라.**
- routing rule에 `require`가 있으면(예: architecture의 "대안 2개 이상") 충족 못 한 결과는 PLANNED로 승격시키지 말고 investigator에게 되돌린다.

## 5. 검증
investigator가 코드를 안 고쳤는지 `git status -s`로 확인한다. 고쳤으면 규정 위반 — `last_error`에 기록하고 그 이슈를 BLOCKED로.

## 6. 기록
처리한 이슈·routing 결정·depth를 `company/logs/<오늘>-events.log`에 append.

## Engineering Lead의 권한과 한계
**있는 것**: role routing, investigation depth, research budget, escalation, block/defer 판단, 재시도 여부.
**없는 것**: main 직접 커밋, 시크릿 접근, 프로덕션 배포, 파괴적 명령, security-reviewer의 BLOCK 판정 번복. 이건 CLAUDE.md와 `guard-destructive.sh`가 강제한다.

## 절대 금지
- DETECTED 이슈를 investigator 없이 직접 PLANNED로 바꾸기 (단, severity P3/P4는 `trivial` rule에 따라 investigation 생략이 허용됨 — 이건 routing 결정이지 우회가 아니다)
- routing 근거를 기록하지 않고 Role 호출
