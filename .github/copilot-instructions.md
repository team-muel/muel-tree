# Copilot Review Instructions

Review changes as production application code, not as isolated diffs.

Prioritize:
1. correctness and regression risk
2. client/server boundary mistakes
3. Supabase, auth, and environment-variable security
4. data consistency and idempotency of external effects
5. failure, retry, loading, and empty-state behavior
6. accessibility and user-visible regressions
7. maintainability

Flag changes that:
- expose secrets through `NEXT_PUBLIC_*` or client bundles;
- move privileged logic into the browser without justification;
- add persistence or external writes without retry/idempotency analysis;
- weaken lint/build validation;
- mix broad refactoring with functional changes such that reviewability drops;
- change routing, auth, or schema behavior without tests or explicit verification.

Prefer concrete findings tied to failure scenarios over style-only comments.
