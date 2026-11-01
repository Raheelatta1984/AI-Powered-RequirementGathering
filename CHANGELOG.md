# Changelog

All notable changes to Clarity are recorded here — past, present, and planned. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

**Every pull request and every merge updates this file.** Add your entries under
`[Unreleased]` in the same pull request as the change; planned work that has not been built yet is
recorded under `[Planned]`. The in-app **What's new** tab reads this file directly. See
[docs/CHANGELOG_POLICY.md](docs/CHANGELOG_POLICY.md).

## [Unreleased]

### Added

- Guided elicitation of every answered question: each response is rephrased by the AI BA (or a deterministic guided expansion when no API key is configured) into a detailed, testable statement, with the original wording retained and the gaps explicitly named.
- Stakeholders can refine the detailed version of their own answers; the refinement is attributed and invalidates dependent review approvals.
- "What's new" tab in the workspace, generated from this changelog, with Past, Present, and Planned entries. Repository policy, pull-request template, and a CI check enforce an entry with every pull request or merge.
- Workspace master setup for change management: Prosci-informed planning is optional and off by default. Each ADKAR outcome, each Prosci phase, and the people-and-adoption review can be enabled individually per engagement.
- Invite additional stakeholders at any time; their interview runs in parallel with the existing sittings and their private link is issued immediately.
- Interviewer progress board: per-stakeholder phase-by-phase progress, current question, idle time, behind/active/paused state, and one-click reminders.
- Gentle in-app reminders for stakeholders who stop participating, plus an automatic sweep that never nudges a stakeholder who has paused or is on a break.
- Stakeholders are asked how much time they have for the interview, with pacing that tells them what remains and offers a pause when the budget is exhausted.
- MoSCoW priorities are auto-adjusted from the question being asked, with the reason shown and a stakeholder override retained.

### Changed

- Suggested answers are now detailed, question-specific starting points; the arrow on a suggestion submits that answer immediately.
- `npm test` now syntax-checks the browser specification before running the unit and API suites, so a broken browser test fails fast instead of silently skipping. CI also surfaces each failing browser test as a check annotation.
- Delivery gates, review areas, and the Markdown handoff adapt to whether change management is enabled for the engagement.
- Workspace schema v13 migrates v12 workspaces in place; records that were reviewed under the previous mandatory Prosci gates keep those gates.

### Fixed

- Stakeholder presence heartbeats no longer change the record revision, so an active interview cannot fail its version check while someone is reading.

## [12.0.0] - 2026-10-31

### Added

- Working BA workspace implemented from the v11 specification: dashboard, engagement workspace, solution catalog, and handoff library.
- Ten-phase guided interview framework with private, high-entropy stakeholder links, server checkpoints, and explicit completion receipts.
- Availability-aware scheduling with IANA timezones, non-overlapping BA sittings, rescheduling, and RFC 5545 calendar exports.
- Optional Anthropic integration for adaptive questions and reviewed synthesis, with structured output, timeouts, evidence-reference validation, and explicit guided fallback.
- Cross-functional verification, four review areas, and a server-enforced delivery gate that unlocks a checksummed Markdown handoff.
- Text evidence attachments, original-answer retention, audit history, optional browser speech input and read-aloud.
- Documentation, unit/API/browser tests, CI workflow, and Render deployment blueprint.

### Changed

- The Prosci-informed change plan (sponsor, impact, ADKAR outcomes with owners and measures) was mandatory before a handoff could be generated.

## [11.0.0] - 2026-10-30

### Added

- Repository specification (`readthis.md`) describing the AI-led requirements gathering workspace, its interview model, verification approach, and handoff expectations.

## [Planned]

### Planned

- Multiple AI BA voices per engagement, so a stakeholder can choose a conversational style.
- Optional notification delivery by email or chat webhook for reminders, with per-stakeholder quiet hours.
- Evidence attachments beyond text (PDF, Word, spreadsheets) with server-side extraction and redaction.
- Organisation-level analytics across engagements: participation time, question coverage, and gate bottleneck reporting.
- Reviewer identities backed by an identity provider rather than recorded attestations.
