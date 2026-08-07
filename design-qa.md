# Design QA

- Source visual truth: `design-reference/selected-option-1.png`
- Implementation screenshot: `design-reference/implementation-electron.png`
- Combined comparison: `design-reference/qa-comparison.png`
- Target viewport: Electron window 1440 × 1024 CSS px
- Source pixels: 1487 × 1058
- Implementation pixels: 1440 × 992 (content viewport after the macOS title bar)
- Density: deviceScaleFactor 1; both images fit proportionally into equal-width 640px-high comparison panes
- State: default dark theme, all three games subscribed, list view, active/upcoming schedules, three alerts enabled

## Full-view comparison evidence

The combined comparison verifies the three-column proportions, sticky left navigation, center timeline hierarchy, right notification queue, dark navy color balance, cyan selection states, date grouping, control density, and overall information rhythm. The implementation preserves the reference's core structure and scales cleanly within the slightly shorter Electron content viewport.

## Focused region comparison evidence

Focused inspection was performed on the top toolbar/filter row, the first two date groups, subscription controls, and notification queue. Text remains legible without clipping, icons are consistent Tabler assets, status colors are semantically distinct, and interactive controls retain visible hover/selected states. No custom raster content was required by the source; abstract game marks use the selected icon library rather than copyrighted assets.

## Required fidelity surfaces

- Fonts and typography: Pretendard with Korean system fallbacks; hierarchy and compact 9–17px desktop scale match the dense source. No actionable wrapping or truncation issues.
- Spacing and layout rhythm: 250px navigation, flexible schedule workspace, 338px notification rail; row rhythm and dividers match the source. Responsive rails collapse at 1180px and 820px.
- Colors and visual tokens: navy surfaces, low-opacity blue-gray separators, cyan active controls, and per-game/type semantic accents match the source direction with sufficient contrast.
- Image quality and asset fidelity: the source contains no required character art or photographic imagery. Icons use `@tabler/icons-react`; no emoji, placeholders, handmade SVG, or low-resolution assets are used.
- Copy and content: Korean labels, three requested game names, event types, KST dates, status, reminders, and official-source actions are present. App branding is intentionally original.

## Interaction and runtime evidence

- Electron-rendered rows before filtering: 9
- Calendar/list navigation: passed
- Search (`특별 방송`) reduced visible rows to 2: passed
- Subscription change persisted to localStorage: passed
- Electron renderer console errors: none
- Production web build: passed
- Sites worker/static packaging tests: 4/4 passed
- macOS arm64 Electron application bundle: created successfully

## Findings

No actionable P0, P1, or P2 differences remain. Intentional deviations are the original `게임타임` brand, real functional bell controls, and omission of copyrighted game artwork/logos.

## Comparison history

1. Initial render: major layout and visual tokens matched. One Electron security warning appeared because no CSP was declared.
2. Fix: added a restrictive Content Security Policy and Korean document metadata.
3. Post-fix evidence: final Electron smoke test reports zero console errors; visual layout is unchanged.

## Follow-up polish

- P3: replace Electron's default app icon with a signed production brand asset before distribution.
- P3: add real official-source ingestion and review tooling before treating schedule data as live.
- P3: notarize/sign macOS and Windows release packages for public distribution.

final result: passed
