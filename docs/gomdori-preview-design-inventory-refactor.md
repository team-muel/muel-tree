# Gomdori Preview Design Inventory Refactor

Date: 2026-06-24

Scope: `/game/preview` in `muel-tree`.

This is a verification and refactor design note. The target is not another
implementation burst. The target is to make design changes from recent UI PRs
inspectable from the preview surface without turning the screen into an LLM
wall of dense prose.

## Recent Design PR Clusters

Recent `muel-tree` PRs show five UI/design streams:

1. Stage and display structure:
   - #78 Feign flow, idle token motion, phase sweep, verdict staging.
   - #80 display adaptation, mobile structure, roaming stage, landing/lobby.
   - #81 lower-band layering fix.
   - #83 in-game UX batch and match transition cleanup.
   - #84 identity guessing, token drag, unread badges, interactive preview.
2. Role and ability information:
   - #87 in-game codex, role guessing wiring, first-night preview, morning report.
   - #94 role roster readability.
   - #109 single role ability source and implementation status badges.
   - #110 all original abilities marked live/partial/planned.
   - #111-#148 per-role UI/status/event metadata syncs.
3. Lobby, chat, and bottom-dock hierarchy:
   - #105 AI mercenary UI and model brand token.
   - #106 personal spec dock.
   - #107 town/dead chat UI.
   - #116-#125 chat avatars, timer controls, spectator/chat adjustments,
     dock relocation, dockable chat.
   - #152 TownChat unification.
   - #155 chat readability.
4. Visual token consistency:
   - #149 borderless meta chips.
   - #150 faction color token unification.
   - #151 preview fidelity and shared ambient backdrop.
5. Final UX cleanup:
   - #156 timer, inline log, contact log, transition wait, gauge batch.

The closed-unmerged UI exception from the recent batch is #139 Besto v2 UI. Its
current design data still exists in the role manifest as partial/planned entries
for Besto, so preview should expose the current manifest state rather than
pretend the closed PR landed.

## Current Problem

`/game/preview` is currently a phase workbench. It is good for checking the
visible game flow, but it is not a design inventory:

- Phase scenes are visible, but their source design tokens are not easy to
  inspect in one place.
- Role visuals, motifs, ability status, action types, and reveal copy live in
  multiple config files.
- Event copy and status effects are only discoverable by reading source files or
  finding the exact phase where they happen to render.
- The preview header contains explanatory prose, while the design data itself is
  mostly hidden behind phase interactions.

## Requirement

Add a design inventory inside `/game/preview` that is:

- Complete enough to inspect all current design sources from the preview route.
- Hierarchical: summary first, table rows second, details on demand.
- Searchable/filterable enough to find a role, event, status, action, motif, or
  phase quickly.
- Low-density by default. Expanded detail is available, but the default view
  must not be a long prose dump.
- Connected to live single-source config exports, not copied into a second
  static list.

## HID Target

For this refactor, HID means human-inspectable design:

- A human can answer "where is this design fact represented?" from preview.
- The UI keeps the highest-signal information at row level.
- Dense text is hidden behind native disclosure controls.
- Source filenames are shown where useful, so future work knows which manifest
  owns each fact.

This is not high information density for its own sake. The default state should
scan like an index, not like generated documentation.

## Data Sources

The preview inventory should read directly from:

- `src/config/design-tokens.ts`
  - `PHASE_TONES`
  - `MOOD`
  - `FACTION_COLORS`
- `src/config/gomdori-rules.ts`
  - phase labels, details, durations, pace settings
- `src/config/gomdori-roles.ts`
  - role labels, titles, factions, reveal copy, passives, summaries,
    night actions, extra actions, original abilities, implementation status
- `src/config/gomdori-role-visuals.ts`
  - symbol, mood colors, glow, motif, future illustration slot
- `src/config/status-effects.ts`
  - effect labels, icons, badge classes, descriptions
- `src/config/gomdori-events.ts`
  - event audience, tone, icon, sample line
- `src/config/illustrations.ts`
  - self-hosted illustration ids, source paths, focal points, tones, edge rules

## Refactor Shape

Add `src/components/game/preview/DesignInventory.tsx` and render it near the top
of `/game/preview`, before the heavy phase sections.

Structure:

1. Summary strip:
   - role count
   - ability implementation count
   - phase tone count
   - event copy count
   - status effect count
2. Controls:
   - search input
   - inventory view tabs: roles, phases, tokens, events, status
3. Roles view:
   - compact table: emblem, role, roster/faction, archetype, action count,
     ability status, motif
   - details disclosure: reveal, passive, summary, action types, original
     abilities with status badges, source files
4. Phases view:
   - compact table: phase, label, mood, duration, accent
   - details disclosure: background token, source ownership
5. Tokens view:
   - compact table: faction, mood, glow, surface, and illustration token classes
   - direct ownership back to `design-tokens.ts` and `illustrations.ts`
6. Events view:
   - compact table: event type, audience, tone, icon, sample line
7. Status view:
   - compact table: effect id, label, icon, description, badge class

## Visual Hierarchy Rules

- Default row level shows only facts needed for scanning and comparison.
- Long reveal/passive/original ability text is behind `<details>`.
- Tables use one restrained surface, not nested cards.
- The role emblem remains the visual anchor for role rows.
- No explanatory hero or marketing copy.
- Keep all preview phase sections exactly where they are functionally; the new
  inventory is an index above them, not a replacement for phase validation.

## Verification

Minimum gates:

- `npm run lint`
- `npm run build`

Visual check:

- `/game/preview` desktop: inventory scans without crowding the phase workbench.
- `/game/preview` mobile: inventory is horizontally scrollable where needed and
  does not break the existing preview scenes.

Completion is not proven until the inventory is rendered from live config
exports and the build passes.
