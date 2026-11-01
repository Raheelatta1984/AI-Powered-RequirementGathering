# Architecture

## Runtime

- React 19 + Vite frontend, self-hosted Inter font, lucide icons, responsive CSS.
- Node.js 22 + Express 5 API serving the built frontend and JSON endpoints on one origin.
- Zod input/catalog validation; domain functions enforce state transitions independently of the UI.
- A local JSON document store with a serialized mutation queue, optimistic record revisions, temporary-file writes, and atomic rename. Data files are created with owner-only permissions. This is a single-process/single-workspace design, not a distributed database.
- Optional Anthropic Messages API calls from the server. No provider key is embedded in frontend code or persisted in engagement records.

## State transitions

```text
created → interviewing → validating → review → delivered
              ↑              |          |
              └── reopen ────┴──────────┘
```

The first three active stages are derived from evidence, not a freely editable status field:

1. `interviewing`: at least one roster member has not completed and confirmed all phases.
2. `validating`: all interviews are complete, but checks have not all been answered and resolved.
3. `review`: verification is complete; named review approvals and the change plan are still required for export.
4. `delivered`: a gated artifact exists; evidence, reviews, and interviews are locked in the application.

The roster locks at creation. There is no “remove incomplete stakeholder” shortcut. A BA can reopen a completed interview with a specific question; prior responses remain, checks are archived, approvals are cleared, and the full gate must pass again. Unknown/skipped responses count as explicit elicitation outcomes, not invented requirements. They remain open decisions in the handoff.

## Interview engine

`server/questions.mjs` defines ten phases with three core questions each. A short, vague, or unmeasured answer can trigger up to two follow-ups in that phase, for a maximum of five ordinary questions. Question IDs are unique and the next question is derived from saved responses. The pending question is persisted before an answer can be accepted.

With a key, Claude can adapt the wording, hint, and five editable suggestions to the stakeholder’s role and recent answers. The question key, phase, order, and gate remain server-controlled. Exact repeated questions fall back to the guided template. Provider failure produces an explicit guided-question notice. The model cannot approve requirements, resolve conflicts, or execute tools.

The original guide inconsistently described both five questions per requirement and five per phase. V12 uses the concrete phase cap above and documents that decision.

## Scheduling and isolation

Each person has three sittings: phases 1–3, 4–6, and 7–10. Availability is expressed in IANA local time and converted to UTC with DST checks. Nonexistent spring-forward times are rejected. The scheduler searches 90 days, places sittings on different local days, and prevents overlap with the BA’s other active bookings. A sitting boundary offers pause or explicit early continuation; wall-clock time never silently truncates elicitation.

Calendar files are `METHOD:PUBLISH`, `STATUS:TENTATIVE`, UTF-8 folded ICS. They are imports, not sent invitations or proof of calendar acceptance.

Invite tokens contain 256 bits of randomness. Only SHA-256 hashes are stored. Tokens are returned on issuance/rotation, expire after 90 days, and are not included in exports. Interview endpoints return the current person’s evidence and assigned checks only. Attributed statements from other stakeholders are revealed only in post-completion verification prompts that intentionally require comparison. Lead endpoints require workspace authentication when configured.

## Cross-functional verification

After all interviews complete, the domain layer compares normalized answers for shared keys: success metric, data classification, release constraint, and priority. Different wording is a **potential perspective difference**, not a proven contradiction. Security and technical coverage checks are also created. Assignment prefers a different person in the relevant function. A single-person engagement returns checks to the same source and prominently records the limitation.

Each check requires an assignee response and a separate BA resolution. The resolution is the authoritative human decision; the application does not silently choose a winning answer.

## Evidence and export

Requirements are grouped by elicitation phase and retain source response IDs, original wording, stakeholder/function attribution, proposed priority, scope flags, and a deterministic evidence-coverage heuristic. The heuristic is not an assurance score.

`server/markdown.mjs` creates a reviewed handoff, not a claim of a final PRD or deployed solution. It includes:

- Context, outcomes, scope, stakeholder completion, and existing-solution baseline/delta.
- Requirement register and proposed acceptance criteria.
- Technical reservations and validation actions.
- STRIDE-informed threat scenarios, proposed precautions, and verification actions.
- ADKAR actions, owners, measures, and three-phase change approach.
- Verification responses/resolutions, unknowns, traceability, review records, original transcripts, text evidence, and audit history.

AI synthesis may enrich acceptance criteria, reservations, and threats, but every cited response ID must exist. The full evidence appendix remains deterministic. AI failure does not silently become “AI output”: generation stops unless the BA explicitly allows guided synthesis. Large evidence sets exceeding the configured AI input budget use the same explicit decision path.

Artifacts contain a version, timestamp, engine label, SHA-256 hash, and complete Markdown. The application prevents post-generation edits. This is tamper-evidence, not a cryptographic signature or protection against an administrator editing the underlying store.

## Deliberate limits

No external mail/calendar integration, live multi-user interview room, binary document parsing, SSO, multi-tenancy, production-estate discovery, code generation, or automated release approval. See SECURITY.md and V11_TO_V12.md before extending the system.
