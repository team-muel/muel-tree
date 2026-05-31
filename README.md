# Muel

`muel-tree` is the Vercel-hosted landing page and Activity surface for Muel.

## Landing Terms

- **Muel** — Bot
- **Gomdori** — Game, operated as a `Discord <-> Toss` experience
- **Weave (일기)** — App, operated as a `Discord <-> Toss` experience. Discord command: `/일기`, Activity route: `/weave`
- **Server** — Discord (live, invite: https://discord.gg/NdBHcbXpjh)
- **Team** — updates and public-facing notices

## Current Routes

- `/` — Muel landing page
- `/weave` — 일기 Activity (Discord command `/일기`)
- `/force` — force-layout test surface
- `/payment/success`, `/payment/fail` — Toss Payments return pages
- `/api/dreams` — public graph data (content excluded, tag/keywords/emotions only)
- `/api/dreams/submit` — authenticated Discord Activity write endpoint
- `/api/discord/token` — Discord Activity OAuth token exchange
- `/api/service-events` — shared service event log
- `/api/dreams/me` — authenticated personal dream read endpoint (content included)
- `/api/payments/confirm` — Toss Payments server confirmation (requires `TOSS_SECRET_KEY`)

## Activity Pattern

Each Discord Activity is a route in this repo served as an iframe inside Discord. Common logic (Discord SDK init, auth, error handling, service event logging) lives in `src/components/ActivityLayout.tsx`. Activity metadata is centralized in `src/config/activities.ts`.

To add a new Activity: register it in `src/config/activities.ts`, add the matching server-only secret key in `src/config/activity-server.ts`, create a route folder (e.g. `src/app/game/page.tsx`), wrap content in `<ActivityLayout>`, add the `NEXT_PUBLIC_*_DISCORD_CLIENT_ID` and `*_DISCORD_CLIENT_SECRET` env vars, and register the route in the corresponding Discord Application's URL mapping.

## Data Layer

- **Supabase**: `dreams`, `dream_connections`, `service_events`, `sources`, `muel_profiles`, `muel_profile_identities`
- Discord users are upserted into `muel_profiles` on first interaction via `upsertDiscordMuelProfile`
- Dreams and service events reference `muel_profile_id` for cross-service identity

## Service Registry

Public service names, labels, routes, statuses, CTA links, and operating models live in `src/config/services.ts`. The landing page and navigation read from that registry so Muel / Gomdori / Weave / Server stay aligned before adding routes or bot commands.

## Operations Docs

- `docs/weave-operations.md` — Weave entry, save, error UX, and release checklist
- `docs/supabase-data-flow.md` — current Supabase tables and planned data flow

## Deployments

- Web app: Vercel
- Bot entrypoint: Render, via the separate `muel-bot` repository

## Local Development

```bash
npm install
npm run dev
```
