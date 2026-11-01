# Verification

## Automated suites

`tests/v13.test.mjs` covers detailed elicitation and refinement, auto-adjusted MoSCoW, optional change management (enable/disable and per-process toggles), parallel stakeholder invitations, time budgets, pause/break reminder suppression, the reminder sweep, changelog parsing, workspace settings, and the new HTTP endpoints. The browser suite also exercises the time-budget prompt, refining an expanded answer, the suggestion-submit arrow, enabling change management from the engagement, the live progress board, inviting a stakeholder mid-engagement, and the **What's new** tab.

`npm test` uses Node’s built-in test runner. It covers:

- Ten-phase completion, unique question IDs, adaptive follow-up cap, explicit unknowns.
- All-stakeholder completion gate and rejection of premature review/export.
- Cross-functional assignment and single-source limitations.
- Reopening with evidence retention, archived checks, and approval invalidation.
- Stale revisions, invite hashing/rotation, and change-plan invalidation.
- IANA timezone conversion, Sydney DST/nonexistent times, availability, non-overlap, ICS escaping/folding.
- Catalog schema, duplicate IDs, path traversal, configured-source sync, and merge behaviour.
- AI request structure, schema validation, and rejection of invented evidence references (mock provider; no external AI call).
- Markdown metadata escaping and retention of raw evidence as data.
- Full HTTP workflow through verification, four reviews, generation, download, and restart persistence.
- Interview response isolation, authentication cookies, CSRF rejection, and text-evidence limits.
- Existing-solution baseline snapshots surviving catalog changes.

`npm run test:e2e` uses Playwright against a fresh temporary API/workspace on port 3001:

1. Create an engagement through the wizard, open a private interview, answer, pause/resume, complete, answer verification, resolve as BA, fill the change plan, record four reviews, generate and download Markdown.
2. Register a solution, start an existing-change engagement with baseline/delta, and check mobile navigation/layout overflow.

The repetitive middle interview answers in the browser test use the same public HTTP API; the critical completion, verification, review, and export actions are exercised through the UI.

## Running browser tests

```bash
npm ci
npm run build
npx playwright install chromium
npm run test:e2e
```

On Linux CI, `npx playwright install --with-deps chromium` installs required system libraries. A custom Chromium binary can be supplied with `PLAYWRIGHT_EXECUTABLE_PATH`. The checked-in GitHub Actions workflow runs unit/API tests, the production build, and browser tests without provider credentials.

## Manual checks still required in your environment

- Real Anthropic account/model access, provider latency, spend controls, and output quality. Tests mock the provider contract; they do not claim a live model evaluation.
- Actual microphone permissions, browser speech recognition, installed voices, and read-aloud on target devices.
- Calendar import behaviour in Outlook/Google/Apple Calendar and organisational timezone/DST policies.
- Reverse-proxy Host/origin/cookie behaviour, HTTPS, SSO if added, and production rate limiting.
- Encrypted backup restoration, retention/deletion, access controls, and incident response.
- Independent accessibility, privacy, and security assessment before sensitive production use.
- Real stakeholder scheduling acceptance: an ICS import is not an external booking or sent invitation.

## Local persistence note

Development records live under `data/`, which is ignored by Git. Browser tests use temporary directories and do not modify those records. Restart persistence is tested by reopening the same store after a completed export. Do not run multiple application processes against one JSON store.
