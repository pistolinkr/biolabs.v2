---
name: evaluate
description: READY_FOR_EVALUATION 이슈를 독립 검증한다. 3개 명령 실행이 아니라 acceptance criteria 판정이다.
---

# Evaluate

1. `state: READY_FOR_EVALUATION` 이슈를 `evaluation-engineer` subagent에게 위임한다 (검증은 저비용이라 건수 상한 없음).
2. 이슈의 `routing.workers_required`에 `design-conformance-worker`가 있으면 evaluation-engineer가 그것도 호출하도록 지시한다.
3. 결과가 `VERIFIED`면 그대로 둔다 — 종결은 `/reinspect`가 한다.
4. `REOPENED`면 `next_action`에 따라 investigation 또는 remediation 대상으로 남긴다.

## Evaluation은 test runner가 아니다
`pnpm check && pnpm test && pnpm build`는 **최소 조건**이지 충분 조건이 아니다. 세 개가 전부 초록이어도 다음 중 하나라도 실패면 `REOPENED`다:
- resolution_plan의 `validation_plan` 항목이 실제로 확인되지 않음
- 변경 파일이 `affected_files` 범위를 벗어남 (계획 외 변경)
- 회귀: 이전에 통과하던 동작이 깨짐
- `validation_plan` 자체가 비어 있음 (검증 불가능한 계획을 통과시키지 않는다)
- UI 이슈인데 design-conformance-worker가 violations를 보고함

## 절대 금지
- product-engineer가 "통과"라고 적었다는 이유로 위임 생략
- evaluation-engineer가 코드를 고쳐서 통과시키기 (Edit/Write 도구 자체가 없음)
