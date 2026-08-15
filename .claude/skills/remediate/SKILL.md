---
name: remediate
description: PLANNED 이슈를 구현한다. 옛 "수정반"의 구현 부분만 담당. product-engineer subagent에게 위임하는 오케스트레이션 스킬.
---

# Remediate

1. `$BIOLABS3_SHARED/issues/*.yaml` 중 `state: PLANNED`인 것을 severity 순으로 최대 2건(CHARTER 5조, 역할당 PR 상한) 고른다.
2. 각 이슈를 product-engineer subagent에게 위임한다.
3. product-engineer가 `READY_FOR_EVALUATION`으로 돌려주면, **자동으로 evaluate를 잇달아 실행하지 않는다.** 다음 트리거(또는 같은 실행 안에서 명시적으로 `/evaluate` 재호출)가 처리한다 — Hook 하나에 workflow 전체를 의존시키지 않는다(RISK 2 원칙).
4. product-engineer가 `INVESTIGATING`으로 되돌렸으면(계획이 틀렸다고 판단한 경우) 그대로 둔다. 다음 `/investigate` 실행이 다시 집는다.
5. `$BIOLABS3_SHARED/done/<오늘>.md`에 사람이 읽을 요약: 오늘 시도한 이슈, PR 번호, 실패한 것과 이유.

## 절대 금지
- FAILED/BLOCKED 이슈를 재시도 예산 확인 없이 다시 돌리기 (recovery-engineer 몫)
- 하루 2건 상한 무시
