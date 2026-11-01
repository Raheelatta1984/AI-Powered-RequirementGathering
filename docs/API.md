# HTTP API reference

All endpoints are under `/api`. JSON mutations use `Content-Type: application/json`. Lead endpoints require the workspace session cookie when authentication is configured. Interview endpoints use the high-entropy token in the path; do not log or share it. Most engagement mutations require the latest `expectedVersion`; stale writes return HTTP 409.

## Workspace

| Method | Path | Purpose |
|---|---|---|
| GET | `/health` | Liveness and version |
| GET | `/config` | Public mode configuration; never returns secrets |
| POST | `/auth` | `{ token }`; sets signed workspace cookie |
| POST | `/logout` | Clears workspace cookie |
| GET | `/activity` | Latest attributed workspace audit events |
| GET | `/artifacts` | Generated handoffs and content |

## Engagements

| Method | Path | Purpose |
|---|---|---|
| GET | `/engagements` | Dashboard summaries, no raw transcripts or token hashes |
| POST | `/engagements` | Validate and schedule a new/existing engagement; returns private invite tokens once |
| GET | `/engagements/:id` | Lead detail, requirements, gate reasons, reviews, audit, artifacts |
| DELETE | `/engagements/:id` | Remove an example or an unstarted engagement; started records are retained |
| POST | `/engagements/:id/invites/:personId` | Rotate a private token; previous token stops working |
| POST | `/engagements/:id/reschedule/:personId` | `{ index, expectedVersion }`; next available slot for an unfinished sitting |
| POST | `/engagements/:id/reopen/:personId` | `{ question, expectedVersion }`; retain evidence, reset dependent gates |
| POST | `/engagements/:id/verifications/:checkId/resolve` | `{ resolution, expectedVersion }`; requires assignee answer |
| POST | `/engagements/:id/reviews` | `{ area, reviewer, role, decision, notes, expectedVersion }` |
| PUT | `/engagements/:id/change-plan` | Sponsor, impact, five ADKAR action/owner/measure records, revision |
| POST | `/engagements/:id/generate` | `{ expectedVersion, attestation: true, allowGuidedFallback? }`; all gates required |
| GET | `/engagements/:id/artifacts/:artifactId` | Download the locked Markdown |
| GET | `/engagements/:id/calendar/:personId` | Tentative ICS import |

Review areas: `business`, `technical`, `security`, `change`. Decisions: `approved`, `changes-requested`. A changed plan or new evidence clears prior approvals. Generation is not permitted with a requested-changes decision standing in for an approval.

## Private interviews

| Method | Path | Purpose |
|---|---|---|
| GET | `/interviews/:token` | Current person’s record, context, pending question, assigned checks, own evidence notes |
| POST | `/interviews/:token/next` | `{ continueEarly? }`; prepare/cache next question or return sitting/completion checkpoint |
| POST | `/interviews/:token/answer` | `{ questionId, text, disposition, priority, expectedVersion }` |
| POST | `/interviews/:token/complete` | `{ expectedVersion, confirmed: true }`; all phases must be explored |
| POST | `/interviews/:token/verifications/:checkId` | `{ text, expectedVersion }`; only the assigned person |
| POST | `/interviews/:token/evidence` | `{ filename, text, expectedVersion }`; text file up to 64 KB |
| GET | `/interviews/:token/calendar` | This person’s tentative ICS import |

Dispositions: `answered`, `unknown`, `skipped`, `out-of-scope`. Unknown/skip do not require fabricated answer text. Priorities: `Must have`, `Should have`, `Could have`, `Won't have this release`.

Interview responses never include the lead-only engagement detail or other participants’ full transcripts. A verification prompt may intentionally contain attributed statements from completed interviews for comparison.

## Catalog

| Method | Path | Purpose |
|---|---|---|
| GET | `/catalog` | Validated registry and source metadata |
| POST | `/catalog` | Add one verified local solution record |
| POST | `/catalog/sync` | Fetch and validate the server-configured GitHub catalog, then merge |

The sync endpoint accepts no arbitrary URL. See `catalog/solutions.json` and `server/schema.mjs` for the versioned record schema.

## Errors

- 400: schema/validation error.
- 401: workspace sign-in required.
- 403: cross-origin mutation rejected.
- 404: missing record or invalid/expired/rotated invite.
- 409: stale revision or state/gate violation.
- 413: request body too large.
- 429: rate limit.
- 502: catalog source unavailable/invalid.
- 503: AI synthesis unavailable/invalid and guided fallback not explicitly allowed.

Errors return `{ error: string }` without provider credentials or raw stack traces.
