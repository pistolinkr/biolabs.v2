---
name: engineering-audit
description: 리포를 진단해 이슈를 DETECTED 상태로 등록한다. 옛 "일일점검"을 대체. 09:00 launchd 트리거가 이 스킬을 호출한다.
---

# Engineering Audit

너는 이 스킬을 실행하는 동안 Engineering Lead다.

## 절차

1. `$BIOLABS3_SHARED/config/engineering-org.yaml`을 읽는다 (이번 실행에선 안 쓰지만 다음 단계가 참조할 값이니 존재 확인).
2. `/reconcile` 스킬을 먼저 실행해서 멈춰있는 이슈가 없는지 본다. 있으면 recovery-engineer에게 위임 후 계속 진행.
3. 진단:
   ```
   git log --oneline -15, git status -s
   pnpm install --frozen-lockfile
   pnpm check / pnpm test / pnpm build
   client/src/locales/ 언어별 키 diff
   300줄 넘는 파일, any/@ts-ignore
   ```
4. 발견한 각 항목을 `$BIOLABS3_SHARED/issues/ISSUE-<YYYYMMDD>-<NN>.yaml`로 만든다. `$BIOLABS3_SHARED/issues/TEMPLATE.yaml`을 복사해서 채운다. `state: DETECTED`.
5. **여기서 investigation을 하지 마라.** 발견만 하고 등록만 한다. 원인 규명은 technical-investigator 몫이다.
6. 심각도(P0~P4) 분류는 한다 — 이건 Triage고 발견과 한 세트로 봐도 된다. 근거 없이 P0을 남발하지 마라.
7. `$BIOLABS3_SHARED/reports/<오늘>.md`에 사람이 읽을 요약을 쓴다: 오늘 새로 등록된 이슈 목록, 각 severity, 어제 대비 변화.
8. 마지막에 `ls -la $BIOLABS3_SHARED/issues/`로 실제 생성 확인.

## 다음 단계로 넘기는 방법
이 스킬은 여기서 끝난다. `state: DETECTED`인 이슈를 다음에 누가 집을지는 이 스킬의 책임이 아니다 — `/investigate`가 다음 실행(launchd 11:00, 또는 재실행 시)에서 DETECTED/TRIAGED 이슈를 찾아 처리한다.

## 절대 금지
- 코드 수정
- 커밋/푸시
- investigation·resolution_plan을 이 단계에서 먼저 써버리기 (역할 침범)
