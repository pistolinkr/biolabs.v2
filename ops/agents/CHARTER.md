# biolabs3 — 에이전트 사규 (CHARTER)

> 이 문서는 모든 AI 워커가 **작업 시작 전 반드시 읽는다.** 여기 없는 권한은 없는 것으로 간주한다.

## 0. 정체성

`biolabs3` = AI 에이전트에게 맡긴 차세대 biolabs.
그래서 **버전은 v3.0.0부터 시작한다.** v2.x는 사람이 만든 세대, v3.x부터는 에이전트 세대다.

## 1. 근무 시간

| 시각 (Asia/Seoul) | 이벤트 | 주체 |
|---|---|---|
| 08:45 평일 | 작업지시서 `plans/YYYY-MM-DD.md` 작성 | Cowork Claude (사장) |
| 09:00 평일 | 출근 — 코디네이터 기동, 워커 4명 디스패치 | Orca automation |
| 09:00–18:00 | 작업 + heartbeat | 워커 |
| 18:00 평일 | 퇴근 — 일일보고서 `reports/YYYY-MM-DD.md` 작성 | Orca automation |
| 18:30 평일 | 보고 요약을 사장에게 전달 | Cowork Claude |

18:00 이후 새 작업 착수 금지. 진행 중인 것은 마무리하고 `worker_done`으로 종료한다.

## 2. 브랜치 규칙 (엄수)

```
claude/workers/v3/<YYYYMMDD>-<role>-<slug>
예) claude/workers/v3/20260813-qa-fix-vitest-timeout
```

- `release/vN.N` 규칙은 **폐기**. 새 release 브랜치를 만들지 않는다.
- `main` 직접 커밋·푸시 **금지**. 예외 없음.
- 산출물은 **PR까지**. merge는 사장(사람)이 한다.
- PR 제목: `[v3][<role>] <한 줄 요약>`
- PR 본문에 반드시: 왜 고쳤는지 / 무엇을 검증했는지 / 리스크 / 되돌리는 법

## 3. 버전

- `package.json`의 `version`은 **PM 역할만** 올린다. 다음 릴리스는 `3.0.0`.
- 워커는 버전 필드를 건드리지 않는다.

## 4. 절대 금지

- `.env`, 실제 키·토큰·시크릿을 커밋하거나 로그·PR·보고서에 출력하는 것
- `git push --force`, `git reset --hard` (원격 대상), 브랜치·태그 삭제
- 의존성 메이저 버전 업그레이드, 락파일 통째 재생성
- DB 스키마 마이그레이션 실행, 프로덕션 배포 트리거
- 100줄 넘는 삭제가 포함된 변경 (→ 제안만 하고 게이트로 사장에게 질의)

위 항목이 필요하면 `orca orchestration ask` 로 코디네이터에게 물어 결재를 받는다.

## 5. 하루 산출량 상한

역할당 **PR 최대 2개**. 리뷰할 수 없는 양은 만들지 않는 것이 규칙이다.
할 게 더 있으면 `plans/`의 다음 날 백로그에 적는다.

## 6. 완료 보고 (워커 계약)

작업 끝나면 성공·실패 상관없이 **정확히 한 번** 보낸다.

```bash
orca orchestration send --type worker_done \
  --subject "[<role>] <요약>" \
  --body "한 것 / 발견한 것 / 남은 것" \
  --task-id <taskId> --dispatch-id <dispatchId> \
  --outcome succeeded|failed \
  --files-modified "<경로들>" --json
```

긴 작업 중에는 `--type heartbeat`를 주기적으로 보낸다.

## 7. 품질 게이트

PR 올리기 전 워커가 직접 통과시켜야 하는 것:

```bash
pnpm check    # tsc --noEmit
pnpm test     # vitest run
pnpm build    # 빌드 깨지지 않는지
```

세 개 중 하나라도 실패하면 PR 금지. 실패 원인을 보고서에 남긴다.
