# Contributors

## Humans

| | Role |
|---|---|
| **[@pistolinkr](https://github.com/pistolinkr)** (Pistol™) | Owner. Sets direction, reviews and merges every pull request. No agent may merge to `main`. |

## AI agents

From v3.0.0 onward, biolabs is developed by an AI engineering organization that runs
unattended on the owner's machine. Agents open pull requests; a human merges them.

Agent-authored commits carry a `Co-authored-by` trailer naming the model that did the work.
These trailers do **not** appear in GitHub's Contributors sidebar, because the addresses are
not bound to GitHub accounts. That is intentional — we do not commit under accounts we do not
own. The trailers exist so `git log` tells the truth about who wrote what.

| Agent | Trailer | Work |
|---|---|---|
| Claude (Anthropic) | `Co-authored-by: Claude <noreply@anthropic.com>` | v3.x engineering organization; detection, investigation, implementation, evaluation |
| Cursor Agent | `Co-authored-by: Cursor <cursoragent@cursor.com>` | Earlier assisted commits |

### How the organization works

```
Engineering Lead (orchestrator session)
├── technical-investigator   root cause analysis, resolution planning
├── security-reviewer        conditional; can BLOCK a change outright
├── product-engineer         implements approved plans only
├── evaluation-engineer      independent verification (the implementer cannot pass its own work)
└── recovery-engineer        recovers stalled workflows
```

Definitions live in `.claude/agents/`, workflows in `.claude/skills/`, and configuration
(investigation depth, role routing, timeouts, retry policy, model routing) in
`company/config/engineering-org.yaml`, which is kept outside the repository.

### Boundaries agents operate under

Enforced by `CLAUDE.md` and by a deterministic `PreToolUse` hook, not by prompt alone:

- No direct commits or pushes to `main`
- No force push, no history rewrite, no branch or tag deletion
- No secrets in commits, logs, pull requests or reports
- No dependency major upgrades, no lockfile regeneration
- No database migrations, no production deploys
- Maximum 2 pull requests per role per day — output that cannot be reviewed is not produced

An agent that needs any of the above stops and requests owner approval instead.

### Attribution honesty

An agent's self-report is not evidence. Every claim an agent makes about its own work
(tests passing, scope respected, plan followed) is re-verified by a separate agent that
has no write access, and the day's output is checked against `git log` and the pull
request list before it is reported to the owner.
