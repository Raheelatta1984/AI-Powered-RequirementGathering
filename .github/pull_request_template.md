## What changed

<!-- One or two sentences a BA lead would understand. -->

## Why

<!-- The problem this solves. Link the issue or engagement if there is one. -->

## Changelog

- [ ] `CHANGELOG.md` is updated under `[Unreleased]` (or `[Planned]` for future work)
- [ ] Entries describe what a BA lead can now do, not which files changed
- [ ] Anything unbuilt, proposed, or unverified is described as such

## Verification

- [ ] `npm run check` passes (domain, scheduler, persistence, API, AI-contract tests + build)
- [ ] `npm run test:e2e` passes (or explain why it was not run)
- [ ] New fields are covered by tests, including the optional change-management paths
- [ ] Interview changes were checked for: pause/break behaviour, reminders, and time budget

## Risk and boundaries

- [ ] No secrets, tokens, or personal data are added to the repository or fixtures
- [ ] Storage migration from schema v12 is handled (or not required)
- [ ] Documentation is updated for changed API, behaviour, or configuration
