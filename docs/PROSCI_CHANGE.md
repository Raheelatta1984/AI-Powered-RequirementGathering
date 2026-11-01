# Prosci-informed change assessment

Clarity supports the people side of a new or existing solution change. It references public Prosci frameworks; it is **not Prosci-certified, licensed, or a replacement for an organisation’s change practitioner or assessment tools**.

## Optional by default

Change management is **off by default**. At this stage the people side is not mandatory for a requirements handoff, so the workspace provides a master setup (Workspace settings → Master setup) and a per-engagement control (Change plan tab) with:

- A master `enabled` switch — when off, there is no sponsor, impact, ADKAR, or people-and-adoption gate, and the change plan is read-only history.
- Three individually optional Prosci processes: **Prepare Approach**, **Manage Change**, **Sustain Outcomes**.
- Five individually optional ADKAR outcomes: **Awareness**, **Desire**, **Knowledge**, **Ability**, **Reinforcement**.
- An optional **people-and-adoption review** area. Business, technical, and security reviews always apply.

An enabled-but-off element is recorded as an explicit omission in the handoff; it is never implied to be complete. Changing any of these settings invalidates prior review approvals so people-side decisions cannot drift away from the requirements record.

New engagements copy the workspace defaults. Existing engagements keep their own setup, and records created before this option existed retain the mandatory gates they were reviewed against (see [v12 → v13](V12_TO_V13.md)).

## Framework basis

The Prosci ADKAR model describes five individual change outcomes: Awareness, Desire, Knowledge, Ability, and Reinforcement. [1](https://www.prosci.com/blog/adkar-model)

Prosci’s organisational process is described as Prepare Approach, Manage Change, and Sustain Outcomes. [5](https://www.prosci.com/change-management)

## Change record (only when enabled)

When change management is enabled, the BA records — for the elements that are switched on:

- A named accountable sponsor.
- Impacted groups and the nature of the current-to-future change.
- For each ADKAR outcome: an action, an accountable owner, and a readiness/adoption measure.

The starter plan is a set of editable prompts. It does not invent measured adoption, readiness scores, or sponsor commitment. Owners and measures must be confirmed with real people.

| ADKAR outcome | Elicitation and planning focus | Example evidence to obtain |
|---|---|---|
| Awareness | Why now, why this change, what if unchanged | Sponsor brief, team understanding check, unresolved questions |
| Desire | Personal/team impact, motivators, concerns, resistance | Listening-session notes, agreed actions, participation record |
| Knowledge | Role-specific skills, process knowledge, job aids | Training completion plus demonstrated understanding |
| Ability | Practice, coaching, access, real workflow execution | Observed pilot task completion and resolved barriers |
| Reinforcement | Feedback, recognition, operational ownership, correction | Adoption review, outcome trend, corrective-action owner |

## Existing-solution delta

An existing change must select a catalog record and retain its version/source snapshot. The BA records the as-is baseline and requested change. The handoff carries catalog systems, baseline, delta, people impacts, and adoption actions. Before implementation, verify the actual deployed version and assess:

1. **Process and role impact:** what work changes, who gains/loses tasks, decision rights, support ownership.
2. **Technology and data impact:** interfaces, compatibility, migration, reconciliation, retention, regression scope.
3. **Customer and operational impact:** communications, service continuity, training, help channels, accessibility.
4. **Transition and recovery:** pilot, rollout, fallback, rollback, restore, and ownership of unresolved risks.
5. **Benefits and sustainment:** baseline measures, target measures, measurement owner, review cadence, corrective action.

A catalog entry is not evidence of production deployment. Specification-only records are reference material and cannot be selected as an existing deployed solution.

## Three-phase planning mapping

- **Prepare Approach:** confirm sponsorship, impact, readiness, stakeholder engagement, and a tailored change strategy.
- **Manage Change:** deliver the ADKAR actions; coordinate sponsor/manager engagement, communications, training, coaching, and resistance management.
- **Sustain Outcomes:** review adoption and business measures, collect feedback, correct gaps, recognise desired behaviours, and transfer reinforcement to operational owners.

Changing the saved plan invalidates earlier review approvals. When the people-and-adoption review is enabled it must approve the current plan before export; otherwise the plan is included for information only. This keeps the people-side plan aligned with the technical and requirements handoff rather than treating adoption as an afterthought.
