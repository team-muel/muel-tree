# Supabase Data Flow

Supabase is the shared state layer behind Muel services. The public product names stay simple, while Supabase stores service state, identity links, and operational records.

## Current Tables In Use

### `dreams`

Used by Weave.

Observed fields from the app:

- `id`
- `content`
- `emotions`
- `keywords`
- `main_tag`
- `embedding`
- `visibility`
- `created_at`
- `service_slug`
- `discord_user_id`
- `discord_username`
- `discord_avatar`
- `discord_guild_id`
- `discord_channel_id`
- `discord_instance_id`
- `muel_profile_id`

Current writes happen in `/api/dreams/submit` with the Supabase service role key.

Dream reads happen in `/api/dreams` with the Supabase anon key. The public dream payload excludes `content` — graph nodes show `main_tag · keywords` only.

### `dream_connections`

Used by Weave to connect similar dreams.

Observed fields from the app:

- `dream_a`
- `dream_b`
- `similarity`

### `weave_nodes`

ADR-002 multi-source knowledge nodes produced primarily by `muel-bot` and consumed by `muel-tree`.

Observed fields from the app:

- `id`
- `source_kind`
- `owner_user_id`
- `visibility`
- `title`
- `body`
- `tags`
- `source_ref`
- `created_at`

Current graph reads happen in `/api/dreams` with the Supabase service role key:

- `visibility='community'` nodes are visible to everyone.
- `visibility='private'` nodes are visible only when a Discord bearer token resolves to `owner_user_id`.
- The API returns compact graph metadata, not raw `source_ref` or embeddings.

### `weave_node_embeddings`

Used by `/api/dreams` to compute lightweight similarity edges among visible `weave_nodes`.

Observed fields from the app:

- `node_id`
- `embedding`
- `embedding_model`
- `created_at`

### `muel_profiles`

First-class Muel profile records.

Current source of profile creation is Discord identity from Weave. Toss identity can later attach to the same profile table.

Observed fields from the app:

- `id`
- `display_name`
- `avatar_url`
- `created_at`
- `updated_at`

### `muel_profile_identities`

Maps external identities to one Muel profile.

Observed fields from the app:

- `profile_id`
- `provider`
- `provider_user_id`
- `username`
- `avatar_url`
- `metadata`
- `created_at`
- `updated_at`

Current allowed providers are `discord` and `toss`.

### `sources`

Used by Muel Bot's `/구독` utility for YouTube video/community post subscriptions.

This remains a server-side utility table. It should not define the public Muel product structure.

### `service_events`

Used as the shared Muel service event log.

Observed fields from the app:

- `id`
- `service_slug`
- `event_type`
- `route`
- `discord_user_id`
- `discord_username`
- `discord_guild_id`
- `discord_channel_id`
- `discord_instance_id`
- `muel_profile_id`
- `subject_id`
- `status`
- `metadata`
- `created_at`

Current writes happen from server routes with the Supabase service role key.

## Current Flow

```text
Discord Activity
  -> /weave
  -> /api/discord/token
  -> Discord OAuth token
  -> /api/dreams (public + authenticated private graph read)
  -> /api/dreams/submit
  -> Supabase muel_profiles / muel_profile_identities
  -> Gemini extraction and embedding
  -> Supabase dreams
  -> Supabase match_dreams RPC
  -> Supabase dream_connections
  -> Supabase service_events
  -> Weave graph update
```

```text
Muel Bot
  -> research / subscription / memo event
  -> insert_weave_node RPC
  -> weave_nodes + optional weave_node_embeddings
  -> /api/dreams graph read in muel-tree
```

## Planned Flow

```text
Discord / Toss / Bot
  -> Muel service route
  -> Supabase service state
  -> Notion Agent publishing
  -> Team updates and public notices
```

## Ownership Rule

- Landing names live in `src/config/services.ts`.
- Runtime state and identity links live in Supabase.
- Public publishing should later flow through the Notion Agent.
- Legacy bot data should not define new product structure.
