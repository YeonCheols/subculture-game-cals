---
title: GameTime Project Reference
status: canonical
audience: maintainers, AI agents, project skills
last_verified: "2026-08-09"
---

# GameTime Project Reference

This is the canonical technical reference for GameTime (`gametime-subculture-calendar`). Read it before changing architecture, schedule ingestion, runtime data access, deployment, or release behavior. Project-specific agent rules and durable product decisions remain authoritative in [`AGENTS.md`](../AGENTS.md); when this document and executable behavior differ, verify the code and update this document in the same change.

## Product identity

GameTime is a Korean-first responsive web, Electron desktop, Android, and iOS calendar for official schedules from:

- 몬길: STAR DIVE (`monster`)
- 명조: 워더링 웨이브 (`wuthering`)
- 원신 (`genshin`)

Its core user flow is to scan ended, active, and upcoming schedules, subscribe to games, open a shared in-app event detail modal, and manage desktop reminders. On initial entry the UI shows only schedules whose KST start date is today or later; `전체보기` reveals the full history. An exact-date query remains authoritative even for a past date.

## Technology and runtime matrix

| Surface | Technology | Entry point | Data path |
| --- | --- | --- | --- |
| Browser development | React 19 + Vite 6 | `src/main.jsx` → `src/App.jsx` | Vite `/remote-api` proxy, then bundled JSON fallback |
| Hosted web/Sites | Static Vite client + Worker | `dist/client`, `dist/server/index.js` | Worker `/remote-api/*` proxy, then bundled JSON fallback |
| Electron desktop | Electron 43 + React client | `electron/main.cjs`, `electron/preload.cjs` | Main-process HTTPS request, per-query cache, bundled JSON fallback |
| Android / iOS | Capacitor 8 + React client | `android/`, `ios/`, `capacitor.config.json` | Native HTTP request, Preferences cache, bundled JSON fallback |
| Schedule collection | Node.js scripts + Electron browser rendering where required | `scripts/collector/index.mjs` | Official public sources → normalized JSON and raw snapshots |
| Automation | GitHub Actions | `.github/workflows/` | Daily collection on `develop`; tagged desktop and mobile release builds |
| Production deployment | Vercel | `vercel.json` | Git-connected project; production branch is `develop` |

The package is ESM by default (`"type": "module"`). Electron main/preload and browser-rendering helpers use CommonJS where their `.cjs` extension requires it. Dependency versions are pinned exactly in `package.json`.

## Architecture

### Client application

The client is split into three layers. `src/core/` contains platform-neutral schedule calculations, `src/platform/` owns runtime adapters for data, storage, links, and notifications, and `src/App.jsx` composes those capabilities into the React UI. `src/data/schedules.js` defines game identity and locally stored official icons; it is not the runtime schedule source.

Browser loading order:

1. Request `/remote-api/events`, optionally with `?date=YYYY-MM-DD`, and `/remote-api/collection-status`.
2. In development, Vite rewrites these requests to `https://subculture-schdule-api.vercel.app/api/v1/*`.
3. In hosted Sites builds, `worker/index.js` proxies the same endpoints.
4. If the remote request fails, read bundled `/api/events.json` and `/api/collection-status.json`.
5. When a date is selected, apply overlap filtering to bundled data only. Treat a successful remote response as authoritative.

The client refreshes on initial load, date changes, manual refresh, window visibility, Electron refresh IPC, and every five minutes.

### Mobile boundary

Capacitor packages the same `dist/client` output in native Android and iOS shells. Mobile code must call operating-system capabilities through `src/platform/`; React components must not import native APIs directly.

- Schedule access uses native HTTP against the canonical API, then a per-query Preferences cache, then bundled JSON.
- Subscriptions and reminder selections use Capacitor Preferences.
- Official links open through the Capacitor Browser plugin.
- Selected future events are registered with the operating system as local notifications 60 minutes before their verified start.
- Tapping a notification opens the matching shared event-detail modal, including after a cold app start.
- Android declares notification and exact-alarm permissions. If exact-alarm access is unavailable, Android may deliver an inexact notification according to OS policy.
- Schedule changes made while the app is terminated are intentionally not pushed. Reservations are reconciled at launch, foreground refresh, and normal five-minute refreshes.

### Electron boundary

The renderer has `contextIsolation: true` and `nodeIntegration: false`. Keep privileged behavior behind the preload bridge:

- `openExternal(url)`
- `testNotification(title, body)`
- `fetchScheduleData(date)`
- `onRefreshSchedules(callback)`

Electron retrieves schedules in the main process from the remote API. It writes the last valid response to the Electron user-data directory as `schedule-cache-all.json` or `schedule-cache-YYYY-MM-DD.json`. Resolution order is remote → matching cache → bundled JSON. Do not move remote schedule access into the renderer.

### Hosted worker and build contract

`npm run build` performs the Vite build and then `scripts/prepare-sites-build.mjs`. A valid Sites artifact must contain:

- `dist/client/index.html`
- `dist/server/index.js`
- `dist/.openai/hosting.json`

The Worker proxies remote schedule endpoints, maps `/api/events` and `/api/collection-status` to generated JSON assets, and provides SPA fallback only for HTML `GET`/`HEAD` requests. Missing API routes and write requests must retain their original failure response.

Do not casually modify `.openai/hosting.json`, `worker/index.js`, `scripts/prepare-sites-build.mjs`, or `tests/sites-worker.test.mjs`; they form the Sites handoff contract.

## Schedule data contract

Published events live in `public/api/events.json`. Only events with an explicitly parsed `startsAt` are published. Times are extracted as Korea Standard Time (`+09:00`) and serialized as ISO 8601 strings.

| Field | Required | Meaning |
| --- | --- | --- |
| `id` | yes | Stable `<gameId>-<canonical-url-hash>` identifier |
| `gameId` | yes | `monster`, `wuthering`, or `genshin` |
| `type` | yes | `event`, `update`, `maintenance`, `banner`, `broadcast`, or `notice` |
| `title` | yes | User-facing normalized title |
| `sourceTitle` | yes | Title retained from the official source |
| `sourceUrl` | yes | HTTPS canonical official detail URL |
| `sourceLocale` | yes | Source locale, currently `ko-KR` |
| `publishedAt` | nullable | Official publication timestamp |
| `startsAt` | yes for publication | Verified schedule start time |
| `endsAt` | nullable | Verified end time; absence means a single instant |
| `sourceTimeText` | yes | Exact source fragment used to verify timing |
| `status` | yes | `ended`, `active`, `upcoming`, or `unknown` |
| `confidence` | yes | `confirmed` when timing is parsed; non-confirmed events are not published |
| `retrievedAt` | yes | Collector retrieval timestamp |
| `version` | nullable | Parsed game version when present |
| `summary` | yes | Short official-source summary, possibly empty |

Status is recomputed on every collection:

- start in the future → `upcoming`
- started with a valid future/present end → `active`
- started with no end, or end in the past → `ended`
- invalid/missing start or end required for evaluation → `unknown`

`public/api/collection-status.json` records `retrievedAt`, total stored and newly collected counts, and per-source success/failure details. Partial source failures are expected to remain visible; they must not erase previously verified event history.

## Official collection pipeline

Source definitions live in `config/sources.json`:

| Adapter | Game | Official source |
| --- | --- | --- |
| `netmarble-forum` | 몬길 | Netmarble official forum lists and details |
| `naver-lounge-pins` | 명조 | Naver Game `WutheringWaves` official lounge pinned feed, restricted to the configured official nickname |
| `hoyoverse-content` | 원신 | HoYoverse official content API and canonical news pages |

Collection rules:

1. Fetch only configured public official sources and allowed hosts.
2. Use browser rendering only for dynamic public pages that require it.
3. Preserve raw successful-source snapshots under timestamped `data/raw/` directories during a non-dry run.
4. Normalize type, title, canonical URL, provenance, and verified schedule time.
5. Deduplicate by canonical source URL.
6. Merge with stored history rather than replacing it, then recompute status.
7. Publish atomically to `public/api/events.json` and `public/api/collection-status.json`.
8. Surface partial failures through collection status and a non-zero collector exit code.

The scheduled GitHub Action runs daily at `00:10 KST` from `develop`, tests the collector and Sites contract, commits refreshed JSON when changed, and pushes back to `develop`.

## UI invariants

- Use official locally stored app icons for all shared game markers.
- Timeline rows and calendar events open the same in-app detail modal.
- The detail modal exposes verified timing, status, provenance, reminders, and the official source link.
- Do not expose standalone source or settings navigation while those surfaces have no functional content; provenance remains available in event details.
- Game subscription and reminder selections persist through the platform storage adapter (`localStorage` on web/Electron and Preferences on mobile).
- Exact-date filtering applies to both timeline and calendar and refetches the runtime API.
- Default visibility includes only schedules whose KST start date is today or later; `전체보기` includes the full past and future history.
- Keep the selected Timeline Command Center visual direction in `design-reference/selected-option-1.png` unless a newer approved reference replaces it.

## Repository map

| Path | Responsibility |
| --- | --- |
| `AGENTS.md` | Agent instructions and durable product decisions |
| `src/` | React UI and styles |
| `src/core/` | Platform-neutral schedule grouping, overlap, and reminder calculations |
| `src/platform/` | Data, storage, link, runtime, and native notification adapters |
| `src/data/schedules.js` | Game metadata and official local icon paths |
| `capacitor.config.json` | Shared Capacitor application configuration |
| `android/`, `ios/` | Generated native projects and platform manifests |
| `public/api/` | Bundled and hosted schedule JSON |
| `electron/` | Desktop main process and secure preload bridge |
| `scripts/collector/` | Official-source discovery, extraction, normalization, and merge logic |
| `config/sources.json` | Collector source registry |
| `worker/index.js` | Sites runtime proxy, asset API mapping, and SPA fallback |
| `.openai/hosting.json` | Sites resource declaration |
| `tests/collector.test.mjs` | Collector parsing and history invariants |
| `tests/sites-worker.test.mjs` | Worker routing and build artifact contract |
| `.agents/skills/` | Project-local reusable agent workflows |
| `design-reference/` | Selected mock and implementation comparison artifacts |

## Development and validation

Use the repository's existing npm workflow even though both npm and pnpm lockfiles are present:

```bash
npm ci
npm run dev
npm run dev:electron
npm run collect:dry
npm run test:collector
npm run build
npm run test:sites
npm run test:platform
npm run build:desktop
npm run build:win
npm run mobile:sync
npm run build:android
npm run build:ios
```

`build:win` forces an NSIS x64 package regardless of the build host architecture and emits `dist/GameTime-<version>-win-x64.exe`. Release installers are built on the Windows x64 GitHub Actions runner because electron-builder's Windows resource-editing Wine binary does not run natively on Apple Silicon macOS. A `v*` tag publishes the installer and blockmap to the matching GitHub Release only after the workflow's silent-install payload check succeeds.

The same `v*` tag runs the mobile release workflow. Android restores a persistent self-managed signing key from GitHub Actions secrets and publishes signed APK and AAB assets. iOS is built without code signing and published as a ZIP containing the unsigned `.app`; this asset is for build inspection and cannot be installed on ordinary iOS devices. Android release signing uses `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, and `ANDROID_KEY_PASSWORD` repository secrets. The private keystore must never be committed and must be backed up securely because future APK updates require the same signing identity.

Validation by change type:

| Change | Minimum validation |
| --- | --- |
| UI/client | `npm run build`, then `npm run test:sites`; open the local preview |
| Collector/source registry | `npm run test:collector`; use `npm run collect:dry` when network collection is in scope |
| Worker/Sites packaging | `npm run build`, then `npm run test:sites` sequentially |
| Electron boundary | Build plus targeted Electron smoke/manual verification |
| Mobile core/adapters | `npm run test:platform`, `npm run mobile:sync`, then native build for the affected platform |
| Documentation only | Link/path review and `git diff --check` |

Run build before `test:sites`; its artifact test expects the `dist` files to exist. Never treat a concurrent test started before the build completes as a product failure.

## Deployment and branch policy

- `develop` is the working, collection, and Vercel Production branch.
- `main` is currently kept at the same commit as `develop`, but deployment must not depend on it.
- Vercel project: `yeon-cheols-projects/subculture-game-cals`.
- Production URL: `https://subculture-game-cals.vercel.app`.
- Remote schedule API: `https://subculture-schdule-api.vercel.app/api/v1`.

The spelling `schdule` in the deployed API hostname is intentional and must not be corrected locally without migrating the external service and every consumer together.

## Guidance for AI agents and skills

1. Read `AGENTS.md`, then this document, before substantial work.
2. Load only the task-relevant code after using the repository map above.
3. Treat official source URLs, verified schedule times, raw snapshots, and partial failures as data integrity requirements.
4. Preserve user changes in a dirty worktree and keep unrelated changes out of task-specific commits.
5. Update this document in the same change whenever architecture, data contracts, runtime endpoints, branch policy, or validation commands change.
6. Project-local skills may link directly to this file instead of duplicating its content. A skill should read only the relevant section unless its workflow affects multiple system boundaries.
