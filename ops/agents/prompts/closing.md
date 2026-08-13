# 18:00 퇴근 — 일일보고서 프롬프트

너는 오늘 하루치를 정리해 `ops/agents/reports/$(date +%F).md` 를 쓴다. 코드를 고치지 않는다.

## 재료

```bash
cat "ops/agents/reports/$(date +%F).partial.md" 2>/dev/null
git log --oneline --since=midnight --all
git branch -a --list 'claude/workers/v3/*'
gh pr list --state open --json number,title,headRefName,createdAt 2>/dev/null || true
```

## 형식 (이대로 쓴다)

```markdown
# biolabs3 일일보고 — YYYY-MM-DD (수)

## 한 줄
<오늘을 한 문장으로. 잘 됐으면 잘 됐다고, 망했으면 망했다고 쓴다.>

## 빌드 상태
| 항목 | 결과 |
|---|---|
| pnpm check | ✅ / ❌ |
| pnpm test  | ✅ / ❌ (N passed, M failed) |
| pnpm build | ✅ / ❌ |

## 서버
| 항목 | 값 | 전일 대비 |
|---|---|---|
| 최신 배포 | | |
| 5xx 비율 | | |
| 응답시간 p95 | | |

## 오늘 올라간 PR
| # | 역할 | 제목 | 브랜치 | 리스크 |
|---|---|---|---|---|

## 발견했지만 안 고친 것
- (리뷰어가 목록으로 남긴 것. 이게 내일 백로그가 된다.)

## 막힌 것 / 결재 필요
- (게이트에 걸린 질문, 에스컬레이션)

## 내일 제안 (상위 3개)
1.
2.
3.
```

## 규칙
- 숫자를 지어내지 않는다. 확인 못 한 항목은 `미확인`이라고 쓴다.
- 실패를 미화하지 않는다. 아무것도 못 한 날은 못 했다고 쓰고 이유를 적는다.
- 시크릿·토큰·개인정보는 절대 옮겨 적지 않는다.
- 보고서를 쓴 뒤 `main`이 아닌 `claude/workers/v3/<날짜>-report` 브랜치에 커밋하고 PR을 올린다.
