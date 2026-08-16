---
name: fetch-subculture-game-info
description: "Collect, verify, normalize, and update real event, update, banner, livestream, maintenance, and notice data for supported subculture games from official web sources. Use when Codex needs to fetch current information for 몬길: STAR DIVE, 명조: 워더링 웨이브, 원신, or 이환; replace prototype schedules; refresh stale game data; investigate official announcements; or build and maintain the game's ingestion pipeline."
---

# Fetch Subculture Game Info

Collect current game information from official sources and preserve evidence for every normalized record.

## Required workflow

1. Read [references/sources.md](references/sources.md) before collecting data.
2. Read [references/event-schema.md](references/event-schema.md) before producing or changing normalized data.
3. Inspect the repository for an existing ingestion command, raw-data directory, normalized-data directory, and API contract. Extend those conventions instead of creating a competing pipeline.
4. Browse the web for current information. Search only the official domains and official channels listed in the source registry first. Use community sources only to discover an official announcement, never as the final evidence when an official source exists.
5. Open every candidate announcement. Do not create a record from search-result snippets alone.
6. Extract the announcement title, canonical URL, publication time when available, event start/end, timezone, category, and update/version context. Preserve the original wording in `sourceTitle`.
7. Normalize all instants to ISO 8601 with an explicit offset. Use `Asia/Seoul` for display. Do not silently invent a time when the source gives only a date; set the instant to `null` and retain the date/time wording in `sourceTimeText`.
8. Deduplicate by canonical URL first, then by game, normalized title, and overlapping time range. Prefer a newer official correction over an older notice and retain the superseded URL in notes or provenance.
9. Mark uncertain fields explicitly. Never infer dates from version cadence, fan wikis, leaks, or prior patches as confirmed facts.
10. Validate normalized JSON with `node .agents/skills/fetch-subculture-game-info/scripts/validate-events.mjs <file>`.
11. If updating application data, retain `sourceUrl`, `sourceTitle`, `retrievedAt`, and confidence fields in the data layer even if the current UI does not display all of them.
12. Report source coverage, skipped or inaccessible sources, validation results, and unresolved ambiguities.

## Collection policy

- Treat official game news pages as authoritative for game events, maintenance, updates, and banners.
- Treat official YouTube channels as authoritative for scheduled livestreams only after opening the video or channel schedule page.
- Prefer Korean notices. If Korean information is absent or delayed, use another official locale and record the locale.
- Respect robots controls, access restrictions, and rate limits. Do not bypass authentication, bot protection, or geographic restrictions.
- Keep collection read-only unless the user explicitly asks to update repository data.
- Do not claim the refresh succeeded when any required source failed; return a partial result with source-level errors.

## Implementation guidance

For a recurring production collector, separate source adapters from normalization:

`official source -> source adapter -> raw snapshot -> normalizer -> validated event JSON -> app/API`

Store retrieval timestamps and canonical URLs with raw snapshots. Make adapters idempotent and fixture-test parsers because publisher markup changes. Prefer documented feeds or APIs when officially available; otherwise parse public HTML conservatively. Never place scraping logic in React components or the Electron renderer.
