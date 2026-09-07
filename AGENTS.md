# Agent Operating Contract

This repository is an active Team Muel application. AI agents and human contributors must preserve these invariants.

## Source of truth
- Linear owns planning, priority, dependency, and work status.
- GitHub owns implementation, verification, review, merge, release, and deployment evidence.
- Slack is for coordination and conflict resolution.
- Notion is for durable design and handoff knowledge that should outlive a PR.

## Repository invariants
- Preserve the existing application boundaries; do not mix browser-only, server-only, and persistence concerns without an explicit architectural reason.
- Treat Supabase access, authentication, and public/private environment variables as security boundaries.
- Never commit credentials or replace protected server-side secrets with `NEXT_PUBLIC_*` values.
- Changes to persistence, schema, authentication, routing, or deployment behavior require explicit regression analysis.
- External side effects must be retry-safe or idempotent where repeated execution is possible.
- Prefer narrow, reversible changes over broad refactors that mix behavior changes with cleanup.

## Before implementation
1. Identify the corresponding Linear issue when one exists.
2. Inspect affected routes/components/data contracts and adjacent tests.
3. Identify browser/server boundaries and any Supabase or external-service effects.
4. Define the expected failure behavior, not only the happy path.

## Verification
For material code changes, run the repository's deterministic checks. At minimum, preserve the current lint/build contract unless the PR explicitly changes it.

Do not weaken, skip, or rename required checks merely to make a PR mergeable.

## Review priorities
Review in this order:
1. correctness and regressions
2. security and credential boundaries
3. data consistency and external side effects
4. failure and retry behavior
5. user-visible behavior and accessibility
6. maintainability
7. style

Material review findings must be resolved or explicitly dispositioned before merge.
