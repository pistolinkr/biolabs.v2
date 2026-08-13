# biolabs3 백로그 (v3.0.0 목표)

> 오늘자 `plans/YYYY-MM-DD.md` 가 없으면 코디네이터는 이 파일의 위에서부터 집는다.
> 사장(사람)과 Cowork Claude가 갱신한다. 워커는 "발견했지만 안 고친 것"을 여기 아래에 추가만 한다.

## P0 — v3.0.0 전에 반드시
- [ ] `pnpm check` / `pnpm test` / `pnpm build` 3종 그린 상태 고정 및 CI 게이트화
- [ ] 현재 작업트리에 쌓인 미커밋 변경(App.tsx, CommandPalette, i18n 등) 정리 — 커밋 or 폐기 결정
- [ ] `main` 보호 규칙 설정 (직접 push 차단, PR 필수)

## P1 — 있으면 좋음
- [ ] i18n 키 누락 검사 스크립트 (`locales/*/**.json` 키 집합 일치 검증)
- [ ] BOA5 대시보드 / Helix ask bar 리팩터링 대상 식별
- [ ] 300줄 초과 컴포넌트 목록화 및 분할 계획

## P2 — 백로그
- [ ] `ai:smoke` 를 CI에서 돌릴 수 있게 키 없는 폴백 경로 정리

## 워커가 발견한 것 (자동 추가 영역)
<!-- append below -->
