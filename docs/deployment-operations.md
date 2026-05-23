# Muel Tree Deployment Operations

Last updated: 2026-05-14

## Runtime Boundary

`muel-tree` is the web and Discord Activity surface. It should stay on Vercel.
`muel-bot` is the always-on Discord Gateway process and should stay on Render or
another always-on host.

Product identity is separate from repository identity:

- Muel uses the shared platform, hub, Weave, memory, and service registry.
- Gomdori uses Muel infrastructure but is a separate product with its own route,
  Discord application, OAuth credentials, and game state.

## Current Production

- Production URL: `https://muel-tree.vercel.app`
- Gomdori Activity URL: `https://muel-tree.vercel.app/game`
- Vercel project: `muel-tree`
- Vercel framework: Next.js
- Supabase project ref: `pqzmehtuwnxyspfhyucd`
- Supabase region: `ap-northeast-2`

## Required Vercel Environment Variables

Public browser variables:

- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_WEAVE_DISCORD_CLIENT_ID`
- `NEXT_PUBLIC_GOMDORI_DISCORD_CLIENT_ID`
- `NEXT_PUBLIC_MAFIA_GAME_API_BASE_URL`
- `NEXT_PUBLIC_TOSS_CLIENT_KEY`

Server-only variables:

- `SUPABASE_SERVICE_ROLE_KEY`
- `WEAVE_DISCORD_CLIENT_SECRET`
- `GOMDORI_DISCORD_CLIENT_SECRET`
- `TOSS_SECRET_KEY`

Do not put server-only values behind a `NEXT_PUBLIC_` prefix.

## Required Supabase State

The current remote project must expose:

- `mafia` schema through the Data API.
- `service_role` privileges for `mafia` schema, tables, and functions.
- Edge Functions:
  - `auth-exchange`
  - `match-create`
  - `match-join`
  - `match-ready`
  - `match-resolve`
  - `match-start`
  - `match-action`
  - `phase-advance`
  - `health`

For scheduled game progression, prefer Supabase Cron invoking
`phase-advance`. Do not put the game loop inside the Discord bot process.

## Deployment Flow

1. Run local checks:

```powershell
npm run lint
npm run build
```

2. Verify Vercel linkage:

```powershell
Get-Content .vercel\project.json
```

3. Confirm production deploy:

```powershell
vercel deploy --prod
```

4. Verify production routes:

```powershell
Invoke-WebRequest https://muel-tree.vercel.app/
Invoke-WebRequest https://muel-tree.vercel.app/game
```

5. Verify Supabase Edge Functions:

```powershell
supabase functions list --project-ref pqzmehtuwnxyspfhyucd
```

## Discord Activity Checklist

For each product Activity:

- Discord Developer Portal application is product-specific.
- Activity URL points to the product route, for Gomdori:
  `https://muel-tree.vercel.app/game`.
- OAuth redirect URLs match the Activity route and auth exchange flow.
- Vercel has both public client ID and server-only client secret.
- Supabase Edge Function secrets have the matching product client ID and secret.
- The Discord Activity can be opened in a real guild/channel by at least one
  tester account.

## Toss Checklist

For each paid product:

- Use a product-specific Toss app or product-specific key group.
- Keep `NEXT_PUBLIC_TOSS_CLIENT_KEY` public and `TOSS_SECRET_KEY` server-only.
- Verify test payments before switching to real payments.
- Record which route owns payment confirmation.
- Never expose Toss secret keys in browser bundles, logs, or docs.

