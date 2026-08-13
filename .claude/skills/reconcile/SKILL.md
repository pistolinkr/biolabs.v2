---
name: reconcile
description: 멈추거나 타임아웃된 이슈를 찾아 recovery-engineer에게 넘긴다. Hook만으로 workflow 상태를 관리하지 않기 위한 보완 계층(RISK 2). engineering-audit/remediate 시작 시 항상 먼저 실행된다.
---

# Reconcile

이 스킬은 **LLM 판단 없이 먼저 결정론적으로** 이상 상태를 찾는다. 아래를 grep/bash로 확인한다:

```
$BIOLABS3_SHARED/issues/*.yaml 중:
  - state가 IN_PROGRESS인데 updated_at이 engineering-org.yaml의 timeouts_minutes[IN_PROGRESS]를 초과
  - state가 INVESTIGATING인데 updated_at이 타임아웃 초과
  - state가 READY_FOR_EVALUATION인데 evaluation 섹션이 전부 null인 채로 EVALUATING 타임아웃만큼 지남
  - state가 FAILED인데 attempt < retry.max_attempts (재시도 여지 있음)
```

발견된 것이 **없으면** 여기서 끝. recovery-engineer를 부르지 않는다 (평소엔 비용 0).

발견된 것이 **있으면** recovery-engineer subagent에게 그 목록을 통째로 넘긴다. recovery-engineer의 4지선다 결과(resume/retry/reassign/escalate)를 이슈 파일에 반영한다.

## 절대 금지
- 이상이 없는데도 습관적으로 recovery-engineer를 호출 (비용 낭비)
- recovery-engineer의 escalate 판정을 무시하고 자동 재시도
