# Weave (일기) Operations

Weave is the first production candidate for the Muel `Discord <-> Toss` service model. Discord command: `/일기`.

## Public Surface

- **Landing section**: `Weave` in `/`
- **Activity route**: `/weave`
- **Discord command**: `/일기`
- **Operating model**: `Discord <-> Toss`
- **Current status**: beta
- **State layer**: Supabase

## Graph Policy

- The public API (`/api/dreams`) does **not** return raw `content`.
- Node labels are built from `main_tag · keyword1 · keyword2`.
- `emotions`, `keywords`, `main_tag` are public.
- Raw `content` is stored in Supabase but only accessible via authenticated endpoints.
- ADR-002 `weave_nodes` with `visibility='community'` are merged into the graph as community knowledge nodes.
- If `/api/dreams` receives a valid Discord bearer token, it also includes that user's private `weave_nodes`.
- Private node payloads stay light: label, source kind, compact date/source label, tags, and optional source URL only. Raw `source_ref` and embeddings are not returned.
- Weave-node similarity edges are computed server-side from stored embeddings and returned only between nodes visible to the requester.

## Operating Checklist

### Entry

- Discord Activity opens `/weave`.
- The page initializes the Discord Embedded App SDK.
- The page requests `identify` scope and exchanges the Discord auth code through `/api/discord/token`.
- The UI can still render existing graph data if Discord auth is unavailable.
- Writing is disabled unless Discord auth succeeds.
- Authenticated graph reads include the user's private Muel knowledge nodes in addition to public/community nodes.

### Save

- The user writes a dream in the bottom input.
- `/api/dreams/submit` checks the request origin.
- `/api/dreams/submit` verifies the Discord access token against `https://discord.com/api/users/@me`.
- The server trims and validates dream content.
- The server upserts the Discord user into `muel_profiles` via `upsertDiscordMuelProfile`.
- Gemini extracts emotions, keywords, and a main tag.
- Gemini creates an embedding.
- Supabase stores the dream with `muel_profile_id`.
- Supabase stores Discord user and Activity context on the dream row when available.
- Supabase RPC `match_dreams` finds similar dreams.
- Supabase stores any dream connections.
- Supabase stores a `service_events` row (with `muel_profile_id`) for open, submit, or failed submit events.
- The client adds the new dream node to the visible graph using tag/keywords label (not raw content).

### Muel Knowledge Nodes

- `muel-bot` writes research reports, YouTube community items, direct memos, and auto-extracted memos into `weave_nodes`.
- `muel-tree` reads community nodes for everyone and private owner nodes only when Discord auth identifies that owner.
- The graph uses source-kind color/icon vocabulary instead of exposing raw table names.
- Node click metadata should stay glanceable: source label, visibility, date, tags, and a source link when useful.

### Error UX

- Existing graph read failures appear as a small top message.
- Unauthenticated users see `Discord only` instead of a working save shortcut.
- Submit errors stay inside the input panel.
- Server errors should remain generic enough to avoid leaking provider or database details.

### Release Gate

- `/weave` loads inside Discord desktop.
- `/weave` loads inside Discord mobile.
- Anonymous web visitors can view but cannot write.
- Authenticated Discord users can save one dream.
- Failed Gemini or Supabase calls show a readable failure message.
- The graph remains usable after a failed save.
- Build passes with no blocking type or lint errors.

## Next Data Decisions

- Decide whether `discord_guild_id` should become the primary community/session partition for Weave.
- Decide when Toss user identity should attach to `muel_profiles`.
- Decide whether private `research_report` nodes need a separate list/panel beyond graph placement.
- Decide whether cross-source dream-to-weave similarity should be materialized later; current similarity edges are weave-node-to-weave-node and dream-to-dream.
