# Clarity · AI-powered requirements gathering

**Version 13 — a working BA workspace built from the repository’s v11 specification, with optional change management, parallel stakeholder interviews, and a live changelog.**

Clarity helps a BA or senior BA lead frame a new solution or a change to an existing one, interview one or more stakeholders privately, reconcile cross-functional perspectives, and produce a **reviewed Markdown handoff for an AI builder**.

> The original repository contained `readthis.md`, a README, and a license—not the HTML application, setup script, or other deliverables described by the guide. The application is implemented from that guide. See [the v11 → v12 mapping](docs/V11_TO_V12.md) and [what changed in v13](docs/V12_TO_V13.md).

## Deploying to Render?

See the [Render deployment guide](docs/RENDER.md). The common startup failure is a missing `WORKSPACE_ACCESS_TOKEN` in the Render environment; the repository also includes a persistent-disk [`render.yaml`](render.yaml) blueprint.

## Start locally

Requires **Node.js 22.x** and npm (pinned in `.node-version`).

```bash
npm ci
npm run build
npm start
```

Open **http://localhost:3000**. The server binds to `0.0.0.0` for container and live-preview environments. On first start, a local development workspace gets two clearly labelled illustrative engagements. Remove them in the UI, or set `SEED_DEMO=false` before the first start.

No API key is needed for the **guided engine**. Its questions, follow-up rules, scheduling, verification, reviews, and Markdown synthesis are deterministic and explicitly labelled. To enable adaptive Claude questions and AI-assisted synthesis, copy `.env.example` to `.env`, set `ANTHROPIC_API_KEY`, and start with:

```bash
node --env-file=.env server/index.mjs
```

The key stays on the server. AI provider calls are optional; the application does not pretend that guided output is model-generated.

## The workflow

1. **Frame the change.** Choose a new solution or an existing catalog entry. Record the problem, owner, outcomes, scope, exclusions, and constraints. Existing solutions also require an as-is baseline and requested delta.
2. **Bring people together.** Add one stakeholder or a cross-functional roster. Set each person’s timezone, available days, and hours. Clarity proposes three sittings per person and avoids overlapping BA bookings across active engagements.
3. **Share private interviews.** Each stakeholder gets a separate high-entropy link and a tentative `.ics` calendar import. Links expire after 90 days and can be rotated. No email or external calendar booking is sent automatically.
4. **Listen and adapt.** Ten phases cover context, evidence, people, outcomes, scope, functional needs, quality/security, constraints, risks, and priorities. Each phase has three core questions and at most two targeted follow-ups. Every answer is **elicited and rephrased into a detailed, testable statement** — by the AI BA when a key is configured, otherwise by a deterministic guided expansion — while the original wording is retained and the gaps are named. MoSCoW priorities **auto-adjust from the question**, and the arrow on a suggested answer **submits it immediately**. Stakeholders are asked **how much time they have**, and answers are checkpointed on the server; pause/resume does not shorten the interview.
5. **Run interviews in parallel.** Invite another stakeholder at any time. Each person has their own screen and private link, and their sittings can overlap. The interviewer sees **per-question progress for every stakeholder**, who is behind, who paused, and who is on a break — with gentle reminders that are never sent to someone who is paused, on a break, or finished.
6. **Verify across functions.** Only after every stakeholder explicitly completes do potential differences and technical/security coverage gaps become assigned checks. The assignee answers; the BA records the resolution. Single-source engagements are explicitly marked as lacking independent corroboration.
7. **Plan adoption — only if you need it.** Change management is **optional and off by default**. A workspace master setup and a per-engagement switch enable any combination of the three Prosci phases, the five ADKAR outcomes, and the people-and-adoption review. The approach is Prosci-informed, not a certified or licensed Prosci assessment. [5](https://www.prosci.com/change-management)
8. **Review and hand off.** Named business, technical, security, and change reviewers record evidence and reservations. The server unlocks Markdown generation only after every gate passes and the BA explicitly confirms the record.

## The delivery gate is server-enforced

Markdown cannot be generated while any of these remain:

- An incomplete or unconfirmed stakeholder interview.
- A verification question without an answer and BA resolution.
- A missing change sponsor, impact assessment, or ADKAR action/owner/measure — **only for the Prosci elements you enable**.
- A missing or non-approved business, technical, or security review, plus the people-and-adoption review when it is enabled.
- A stale record revision or missing final BA attestation.

New evidence or a changed adoption plan invalidates dependent approvals. Reopening an interview archives old checks and requires completion and verification again. Generated artifacts are locked in the application and include a SHA-256 checksum. Create a new change engagement for subsequent changes.

The Markdown includes requirements and source evidence, proposed acceptance criteria, technical reservations, STRIDE-informed cyber precautions, an existing-solution delta where applicable, adoption actions, traceability, resolved checks, explicit unknowns, review records, and transcripts. **Proposed controls are not implemented controls; a handoff is not a security certification or a final deployment approval.**

## Solution catalog

[`catalog/solutions.json`](catalog/solutions.json) is the versioned repository registry. It initially contains only:

- This workspace, marked **in development**.
- The v11 specification, marked **documentation only / not deployed**.

No fictional company inventory is presented as real. Add verified records through the UI, or publish your actual inventory to the configured repository file. **Sync repository** reads only the configured GitHub owner/repository, path, and ref; it validates the schema before replacing matching repository records. Local additions are preserved. Existing engagements retain a baseline snapshot even if the catalog changes.

```bash
# Optional command-line sync into the versioned registry file
node --env-file=.env scripts/sync-catalog.mjs
# Or, without optional environment variables:
npm run catalog:sync
```

## What's new

The **What's new** tab renders [`CHANGELOG.md`](CHANGELOG.md), which records the past, present, and planned state of the workspace. **Every pull request and merge updates the changelog**; CI enforces it with `scripts/check-changelog.mjs`. See [the changelog policy](docs/CHANGELOG_POLICY.md).

## What is implemented

- Responsive BA dashboard, engagement workspace, solution catalog, and handoff library.
- One-time private links, individual interview isolation, server checkpoints, and explicit completion receipts.
- Availability-aware scheduling with IANA timezones, non-overlapping BA sittings, rescheduling, and RFC 5545 calendar exports.
- Guided mode and optional Anthropic integration with structured output, timeouts, evidence-reference validation, and explicit fallback.
- Cross-functional verification, change planning, four review areas, and a locked Markdown export.
- Text evidence notes (`.md`, `.txt`, `.csv`, `.json`, up to 64 KB each), original-answer retention, and audit history.
- Detailed elicitation of every answer with stakeholder refinement, auto-adjusted MoSCoW priorities, and one-click suggestion submission.
- Optional Prosci-informed change management (master switch plus per-process toggles), parallel stakeholder invitations, a live progress board, time-budget pacing, and respectful reminders.
- A **What's new** tab and a changelog gate for every pull request and merge.
- Optional browser read-aloud and speech-to-text. Voice availability depends on the device; browser speech services may process audio externally. Clarity does not store audio. Transcripts must be reviewed before saving.

## Important boundaries

This is a **single-workspace application**, not a multi-tenant enterprise identity platform. The unauthenticated development mode is for demonstration and non-sensitive data only. Production requires a strong workspace passphrase and HTTPS (secure cookies default on in production); see [deployment](docs/DEPLOYMENT.md) and [security](docs/SECURITY.md). Reviewer names are recorded attestations, not SSO-verified identities. Storage encryption, organisational retention, SSO, and production monitoring belong to the deployment environment.

The app does not send email, reserve external calendars, inspect a live production estate, generate code, deploy a solution, or perform a penetration test. Binary Word/PDF attachments and v11’s six guaranteed voice personas are not implemented; text evidence and device-available browser voices are supported. Outputs are English. These boundaries are deliberate and documented rather than presented as completed integrations.

## Verify

```bash
npm test                 # Domain, scheduler, persistence, API, isolation, AI-contract tests
npm run build            # Production frontend build
npx playwright install chromium
npm run test:e2e         # Browser workflow, export, catalog, existing change, mobile layout
npm run check            # Unit/API tests + production build
```

The browser suite starts an isolated temporary workspace on port 3001. It does not alter the development workspace. See [testing](docs/TESTING.md).

## Documentation

- [Architecture and state transitions](docs/ARCHITECTURE.md)
- [Deployment and configuration](docs/DEPLOYMENT.md)
- [Render deployment and startup troubleshooting](docs/RENDER.md)
- [Security and privacy boundaries](docs/SECURITY.md)
- [Prosci-informed change assessment (optional)](docs/PROSCI_CHANGE.md)
- [Changelog policy](docs/CHANGELOG_POLICY.md)
- [What changed from v12 to v13](docs/V12_TO_V13.md)
- [What changed from `readthis.md`](docs/V11_TO_V12.md)
- [HTTP API reference](docs/API.md)
- [Verification approach](docs/TESTING.md)

## License

The repository’s existing **GNU GPL v3** license is retained. Prose in the historical specification describing unrestricted reuse does not replace the repository’s `LICENSE` file. Prosci and ADKAR are referenced as frameworks; their trademarks belong to their respective owners.
