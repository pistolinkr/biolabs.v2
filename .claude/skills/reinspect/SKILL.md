---
name: reinspect
description: VERIFIED 이슈를 최종 확인하고 CLOSED로 종결한다. 재점검 중 발견된 별개 문제는 새 이슈로 등록한다.
---

# Re-inspect

재점검은 **상태가 아니라 활동**이다(`state_model_v2`). 여기서 하는 일은 두 가지고, 둘은 다른 일이다.

## 1. 종결
`state: VERIFIED` 이슈에 대해 main 기준으로 원래 증상이 재현되지 않는지 가볍게 1회 확인한다(전체 재조사 아님).
- 재현 안 됨 → `state: CLOSED`, `resolved_at` 기록.
- 재현됨 → `state: REOPENED`. 검증이 뭘 놓쳤는지 `last_error`에 적는다. **이건 evaluation의 실패이므로 그 사실 자체를 기록한다** (self-improvement 입력).

## 2. 신규 탐지
재점검 중 원래 이슈와 **무관한** 문제를 발견하면 그 이슈에 끼워넣지 마라. 새 이슈로 등록한다:
`company/issues/ISSUE-<날짜>-<NN>.yaml`, `state: DETECTED`, `source: "reinspection:<원본 이슈 id>"`.

## 3. 일일 요약
`company/reports/<오늘>-summary.md`에 상태별 집계를 남긴다. `FAILED`/`BLOCKED`로 오래 머문 이슈는 "사장 결재 필요" 섹션에.
`security-reviewer`가 BLOCK한 이슈는 반드시 이 섹션 최상단에 올린다.

## 상태 표기
신규 종결은 `CLOSED`를 쓴다. `RE_INSPECTED`는 하위호환으로 읽기만 하고 새로 만들지 않는다.
