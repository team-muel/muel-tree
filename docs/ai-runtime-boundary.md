# AI Runtime Boundary

This document defines the intended AI boundary for `muel-tree`.

## Role

`muel-tree` is the Vercel-hosted web app and Discord Activity surface. It owns
product UI, Activity routes, OAuth/token exchange, Weave, Gomdori `/game`, and
Gemini long-running operation facades.

It should not become the main AI brain for Muel Platform.

The primary AI execution surface is `muel-bot`, which owns Discord assistant
behavior, AI SDK provider policy, memory workers, YouTube/community processing,
and model fallback.

## Allowed AI Responsibilities

`muel-tree` may own:

- user-facing Activity requests that must complete inside a web route
- Gemini long-running operation submission and status/webhook tracking
- product-specific extraction where the UI route is the natural owner
- safe event logging to Supabase

`muel-tree` should avoid:

- duplicating Muel assistant provider policy
- becoming the long-term memory extraction owner
- adding hidden bot behavior
- hardcoding model policy in many routes
- storing or displaying secrets

## Weave Extraction Migration Target

The current Weave dream submission route performs Gemini extraction and
embedding inside the web route. Keep the route ownership, but migrate extraction
toward schema-validated structured output.

Target behavior:

1. Validate request and Discord identity.
2. Extract `emotions`, `keywords`, and `main_tag` with a schema.
3. Retry only within a small budget on validation failure.
4. Generate embedding with explicit dimension expectations.
5. Insert dream and similarity connections.
6. Log service events without exposing raw model output to users.

Regex JSON parsing is acceptable as legacy MVP behavior but should not be the
long-term pattern.

## Coordination With `muel-bot`

When an AI workflow becomes platform-wide, background-oriented, or assistant
behavior, move the policy to `muel-bot` or a shared contract first.

Examples:

- Discord mention reply: `muel-bot`
- memory extraction: `muel-bot`
- YouTube/community post transformation: `muel-bot`
- Activity UI submission: `muel-tree`
- Gemini video/batch operation facade: `muel-tree`

## Model Policy

Prefer the same lane naming as `muel-bot` when `muel-tree` needs local model
configuration:

- extract
- embedding
- long-running-operation

Do not make `muel-tree` choose chat/heavy assistant models unless a product
route explicitly needs that behavior.
