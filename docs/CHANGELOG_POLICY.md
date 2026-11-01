# Changelog policy

**Every pull request and every merge records what changed in [CHANGELOG.md](../CHANGELOG.md).**
The changelog is the single, human-readable history of the workspace, and the in-app
**What's new** tab renders it directly for BA leads.

## The three horizons

| Horizon | Where it goes | What belongs there |
|---|---|---|
| **Past** | A released version heading, e.g. `## [13.0.0] - 2026-11-01` | Everything shipped in that release, written for a BA lead rather than a developer. |
| **Present** | `## [Unreleased]` | Everything merged since the last release. This is where a pull request adds its entry. |
| **Future** | `## [Planned]` | Committed intentions and known gaps. Never described as delivered. |

Planned items move from `[Planned]` to `[Unreleased]` when work is merged, and from `[Unreleased]`
to a version heading when a release is cut. An item that is dropped is moved to `Removed` with the
reason, not deleted.

## Rules for a pull request

1. Add at least one entry under `[Unreleased]` using `Added`, `Changed`, `Fixed`, `Removed`,
   `Security`, or `Deprecated`.
2. Write the entry from the reader's point of view: what they can now do, or what behaves
   differently. Link the relevant documentation.
3. If the change is planned rather than built, add it under `[Planned]` and say so in the
   `[Unreleased]` entry only when part of it has shipped.
4. If a change removes or replaces a previous behaviour, say what happens to existing data,
   records, or approvals.
5. Do not describe proposed controls, planned integrations, or unbuilt features as complete.

## Enforcement

- `.github/pull_request_template.md` includes the changelog checklist.
- `.github/workflows/changelog.yml` runs `node scripts/check-changelog.mjs` on every pull request.
  The check fails when the branch does not modify `CHANGELOG.md`, unless the pull request carries
  the `skip-changelog` label (reserved for documentation-only chores that change no behaviour).
- The merge commit is the record of the merge itself; the changelog entry is the record of why the
  merge happened. Both are retained.

## Wording guide

| Avoid | Prefer |
|---|---|
| "Refactored the reminder module" | "The BA can now see which stakeholder is behind and send a reminder." |
| "Added API endpoint" | "Stakeholders record how much time they have; the interview paces itself to that budget." |
| "Prosci removed" | "Change management is optional and off by default; enabling it restores the sponsor, impact, ADKAR, and people-review gates." |

## Local check

```bash
node scripts/check-changelog.mjs --base origin/main
```
