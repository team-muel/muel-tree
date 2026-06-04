# Muel

`muel-tree` is the Vercel-hosted landing page and Activity surface for Muel.

## Landing Terms

- **Muel** — community AI assistant (Discord bot).
- **Weave** — 여러분이 가꾸어 나가는 지식의 나무. 커뮤니티 멤버가 함께 잇고
  적어 만드는 특수한 나무위키. Muel이 보조하는 *내부 도구*. (Activity route:
  `/weave`. 별도 슬래시 명령 X — 노출 의도가 *제품*이 아니라 *멤버의 도구*.)
- **Gomdori** — 커뮤니티 멤버끼리 함께 노는 비대칭 추리 시간. Discord
  Activity (route: `/game`). *제품* 이 아닌 *함께 노는 도구*.
- **Server** — Discord (live, invite: https://discord.gg/NdBHcbXpjh)
- **Team** — updates and public-facing notices

## Current Routes

- `/` — Muel landing page
- `/weave` — Weave 지식의 나무 (Activity route, 멤버 내부 도구)
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
