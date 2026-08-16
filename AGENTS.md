# Prototype Instructions

Read `docs/PROJECT_REFERENCE.md` as the canonical technical reference before changing architecture, schedule ingestion, runtime data access, deployment, or release behavior. Project-local skills should link to that document instead of duplicating shared project facts.

Run the local server yourself and open the preview in the browser available to this environment. Do not give the user server-start instructions when you can run it.

Before making substantial visual changes, use the Product Design plugin's `get-context` skill when the visual source is unclear or no longer matches the current goal. When the user gives durable prototype-specific design feedback, preferences, or decisions, record them in `AGENTS.md`.

When implementing from a selected generated mock, treat that image as the source of truth for layout, component anatomy, density, spacing, color, typography, visible content, and hierarchy.

Build app UI in `src/`. Keep `.openai/hosting.json`, `worker/index.js`, `scripts/prepare-sites-build.mjs`, and `tests/sites-worker.test.mjs` intact so the same local prototype can be handed to Sites. Before a Sites handoff, run `npm run build` and `npm run test:sites`; the build must leave `dist/client/index.html`, `dist/server/index.js`, and `dist/.openai/hosting.json`.

## Confirmed product direction

- Selected visual: `design-reference/selected-option-1.png` (first displayed ideation result, Timeline Command Center).
- Primary games: 몬길: STAR DIVE, 명조: 워더링 웨이브, 원신.
- Primary surfaces: responsive web UI, Electron desktop shell, and Capacitor-based Android/iOS apps.
- Core task: scan ended/active/upcoming schedules, subscribe to games, and receive desktop reminders.
- Data sourcing: prefer official APIs; use the Netmarble official forum for 몬길 and the Naver Game `WutheringWaves` official lounge for 명조. Use compliant HTML scraping or browser rendering only for public pages, preserve source URLs and raw snapshots, surface partial-source failures, and publish only records with an explicitly verified schedule time.
- Collection policy: run collection daily, merge newly verified records into the stored event history, recompute event status, and show ended, active, and upcoming records in the UI by default. A collection date limits when ingestion runs, not which event dates are displayed.
- Event details: open schedule details in an in-app modal instead of navigating to a separate page. Both timeline rows and calendar event entries must open the same modal, which includes verified timing, status, provenance, notification controls, and the official source detail link. For enriched pickup events, also show each banner's name, kind, phase, featured character and weapon names, rarity, and an official-image gallery with an enlarged viewer.
- Game identity: use locally stored, publisher-provided official app icons for 몬길: STAR DIVE, 명조: 워더링 웨이브, and 원신 everywhere the shared game marker appears; do not fall back to generic decorative symbols while an official icon is available.
- Schedule filtering: provide an exact-date search filter that applies consistently to both timeline and calendar surfaces and can be cleared in one action.
- Runtime data API: Electron must read schedules from `https://subculture-schdule-api.vercel.app/api/v1/events` and collection state from `/api/v1/collection-status` through the main process. Cache the last valid response and fall back to bundled JSON only when both the remote API and cache are unavailable.
- Runtime date filtering: selecting a date must refetch `GET /api/v1/events?date=YYYY-MM-DD`; clearing it must refetch the unfiltered events endpoint. Treat the API response as authoritative because it may include schedules whose ranges overlap the selected date.
- Mobile reminders: Android/iOS use native local notifications scheduled 60 minutes before selected events. They must remain scheduled while the app is terminated; schedule changes that occur while the app is not running are intentionally reconciled on the next launch or foreground refresh.
- Default schedule visibility: on initial entry, show only schedules whose KST start date is today or later. Enabling `전체보기` must include the full past and future history; an explicit exact-date search must still show the API-authoritative results for that date.
- Undated pickups: banner events with `startsAt: null` remain visible in a dedicated `시간 미정` timeline group regardless of exact-date filtering or default-history visibility; other undated event types remain excluded, and undated pickups do not appear in calendar date cells.
- Navigation scope: do not expose standalone `출처` or `설정` navigation until those surfaces have real user-facing behavior. Keep official provenance in the shared event detail modal.
- Redemption codes: expose an in-app `리딤코드` surface with separate `전체 코드` and KST-based `오늘 만료` tabs. Read the official public-code APIs through each platform runtime boundary, support game filtering and search, and provide copy plus official redemption/source actions.
