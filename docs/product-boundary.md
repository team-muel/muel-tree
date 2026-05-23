# Product Boundary: Muel and Gomdori

`muel-tree` and `muel-bot` are shared implementation surfaces. They should not be treated as the product taxonomy.

## Muel

Muel is the platform and identity layer.

- Main assistant and hub surface
- Shared profile, memory, service event, and Supabase infrastructure
- Weave and other Muel-native experiences
- Shared Activity layout, service registry, and deployment foundation
- Shared launcher and utility surfaces where appropriate

## Gomdori

Gomdori is a distinct product experience running on Muel infrastructure.

- User-facing product: Gomdori Mafia
- Web route: `/game`
- Discord application: Gomdori-specific app and OAuth credentials
- Game server state: Supabase `mafia` schema
- Game authority: Edge Functions and Supabase, not Discord chat

## Operating Rule

Say "Gomdori uses Muel infrastructure" rather than "Gomdori is Muel Bot."

Shared repos are allowed. Shared credentials are not the default. Product names, Discord apps, OAuth credentials, routes, and UX language should stay product-specific.

Future miniapps should follow the same factory model: common Muel infrastructure, separate product identity.

Deployment operations live in `docs/deployment-operations.md`. The short
version: this repository owns the Vercel web app and Activity routes; the
always-on Discord Gateway process stays in `muel-bot`.

AI runtime boundaries live in `docs/ai-runtime-boundary.md`. The short version:
`muel-tree` may own route-local Activity extraction and Gemini operation
facades, but the primary Muel AI execution policy belongs in `muel-bot`.
