# Prototype Instructions

Run the local server yourself and open the preview in the browser available to this environment. Do not give the user server-start instructions when you can run it.

Before making substantial visual changes, use the Product Design plugin's `get-context` skill when the visual source is unclear or no longer matches the current goal. When the user gives durable prototype-specific design feedback, preferences, or decisions, record them in `AGENTS.md`.

When implementing from a selected generated mock, treat that image as the source of truth for layout, component anatomy, density, spacing, color, typography, visible content, and hierarchy.

Build app UI in `src/`. Keep `.openai/hosting.json`, `worker/index.js`, `scripts/prepare-sites-build.mjs`, and `tests/sites-worker.test.mjs` intact so the same local prototype can be handed to Sites. Before a Sites handoff, run `npm run build` and `npm run test:sites`; the build must leave `dist/client/index.html`, `dist/server/index.js`, and `dist/.openai/hosting.json`.

## Confirmed product direction

- Selected visual: `design-reference/selected-option-1.png` (first displayed ideation result, Timeline Command Center).
- Primary games: 몬길: STAR DIVE, 명조: 워더링 웨이브, 원신.
- Primary surfaces: responsive web UI and Electron desktop shell.
- Core task: scan ended/active/upcoming schedules, subscribe to games, and receive desktop reminders.
- Data sourcing: prefer official APIs; use the Netmarble official forum for 몬길 and the Naver Game `WutheringWaves` official lounge for 명조. Use compliant HTML scraping or browser rendering only for public pages, preserve source URLs and raw snapshots, surface partial-source failures, and publish only records with an explicitly verified schedule time.
- Collection policy: run collection daily, merge newly verified records into the stored event history, recompute event status, and show ended, active, and upcoming records in the UI by default. A collection date limits when ingestion runs, not which event dates are displayed.
