# Mobile Design QA

source visual truth path: `/Users/ycseng/.codex/generated_images/01a03719-f6de-7f13-a51a-24263ebb1e87/exec-a1f9d5d5-dad6-46d9-9427-0e93bb4d7ca9.png`

implementation screenshot path: unavailable

viewport: target 390 x 844 CSS px

state: schedule home, next-event command deck

## Findings

- [P2] Browser-rendered visual comparison is unavailable in this environment. The local Vite preview opens successfully, but the environment does not expose a screenshot or interactive inspection tool for a 390px capture.

## Implementation Checklist

- [x] Keep the desktop/Electron surface unchanged.
- [x] Add the dedicated mobile command-deck layout and interactions.
- [x] Verify production build and Sites worker contract.
- [ ] Capture and compare the rendered 390px mobile surface.

full-view comparison evidence: blocked; no browser-rendered implementation screenshot is available

focused region comparison evidence: blocked for the same reason

final result: blocked
