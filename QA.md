# Verification record

Date: October 14, 2026. Platform: Windows. Tested production URL: `http://127.0.0.1:4173/circuit-bloom-pixijs/`.

## Results

| Check | Observed result |
| --- | --- |
| Clean lockfile installation | `npm ci` passed; npm reported no vulnerabilities |
| Rule/state modules | 11 Vitest tests passed |
| TypeScript | `npm run typecheck` passed |
| Production build | `npm run build` passed with the Pages subpath |
| Mouse | Corners, edges, center and row boundaries map to the correct cross |
| All gardens | Known solutions win with 2, 3 and 4 moves; input locks; next is deliberate |
| Keyboard | Arrows, boundaries, Enter, Space and Tab exit passed |
| Reset and replay | Fresh board and zero moves; 10 resets retain one canvas and one update per click |
| Rapid input | 20 immediate clicks at one cell return to the initial state; settled canvas PNG bytes match exactly |
| Resize | Input and layout stay aligned at 360×800, 1024×768 and 1440×900; no horizontal overflow |
| Touch | All three gardens, reset, next and replay passed in a separate 360×800 context with touch and DPR 2 |
| Reduced motion | Preference changed during play; correct moves and completion remain |
| Visibility handler | Controlled hidden/visible events freeze identical canvas pixels and resume the animation |
| Diagnostics | Final browser run: zero page/console errors, zero warnings, zero failed requests |
| Visual inspection | Desktop, mobile and completion screenshots inspected; mobile controls/results fit within 800px height |

The automated Chromium user agent reports Chrome 155 on Windows; see `output/playwright/verification.json`. This records the tested environment, not a compatibility claim for physical iOS/Safari or every browser. Browser automation kept `document.visibilityState` visible when a second tab was foregrounded or the window minimized; therefore real background-tab visibility was not independently verified. The event handler itself was exercised with a temporary `document.hidden` override, removed immediately afterward. No performance/fps measurements were taken.

## Repeat the checks

In the project directory:

```sh
npm ci
npm test
npm run build
npm run preview -- --port 4173 --strictPort
```

Leave preview running. In another terminal, use the pinned Playwright CLI:

```sh
npx --yes --package @playwright/cli@0.1.22 playwright-cli -s=circuit-bloom open http://127.0.0.1:4173/circuit-bloom-pixijs/ --headed
npx --yes --package @playwright/cli@0.1.22 playwright-cli -s=circuit-bloom snapshot
npx --yes --package @playwright/cli@0.1.22 playwright-cli -s=circuit-bloom run-code --filename=scripts/browser-check.js --raw
```

`browser-check.js` operates through mouse/keyboard/touch and DOM controls, never directly changes the game state, captures screenshots, and returns the diagnostic report. The extra touch context closes after testing. If no compatible browser is installed, use the CLI's documented `install-browser` command.

## Gameplay capture

```sh
npx --yes --package @playwright/cli@0.1.22 playwright-cli -s=circuit-bloom video-start output/playwright/gameplay.webm --size=1280x800
npx --yes --package @playwright/cli@0.1.22 playwright-cli -s=circuit-bloom run-code --filename=scripts/capture-gameplay.js --raw
npx --yes --package @playwright/cli@0.1.22 playwright-cli -s=circuit-bloom video-stop
```

Wait for the capture command to finish before stopping the recording. It solves all three gardens and returns `status: complete`, `moves: 4`. The delivered WebM is 20.8 seconds at 1280×800, encoded as VP8; its decoded final frame was visually checked. It is a browser capture, not a performance measurement. Screenshots and video are kept in `output/playwright/`.

## Issues fixed during verification

- Removed a PixiJS deprecation warning by keeping trace/bed Graphics as siblings inside a Container.
- Corrected celebration ring geometry so transformed strokes remain thin.
- Cleared celebration effects on reset/next and influence outlines after victory.
- Reduced mobile heading space, restored whitespace in condensed text, and brought controls/result/footer into the 360×800 layout.
- Matched keyboard focus state before comparing reversible canvas pixels; focus outlines are intentionally different from an unfocused board.

No known blocking gameplay defect remains in the tested environment. The owner explicitly approved MIT licensing, commit/push and GitHub Pages deployment on October 14, 2026; public verification is in progress.
