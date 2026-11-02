# Roadmap and verification

## Initial audit — 2 November 2026

The source repository had one `main` branch, one initial commit (`c34ed31`), and a two-line README. No application, dependencies, tests, prototypes, architecture documents or workflows existed. A clean React/Vite foundation was required. GitHub Pages was configured for GitHub Actions; deployment has now been verified.

## Implemented foundation and practice controls

Local searchable library; validated multi-file import; IndexedDB; favourites/recent views; original-file download; responsive notation; real-score playback; speed/seek; track selection/mixer; measure loops; metronome/count-in; practice layout; PWA shell/audio caching; dark/light themes; GitHub Actions quality and deployment workflow.

TypeScript, ESLint, six Vitest tests and production build pass locally and in CI. All four desktop/mobile Chromium browser tests passed before deployment and again against the public GitHub Pages site: import, favourites and reload persistence, notation, playback progression, speed, looping, metronome, practice mode, corrupt-file rejection and offline reload/playback. The in-app browser also rendered the original GP7 exercise and showed advancing playback. Standalone local Playwright launch remains restricted by macOS; the complete browser suite ran successfully on Ubuntu in CI.

## Format verification

| Format         | Parser path          | Tested fixture                                                                               |
| -------------- | -------------------- | -------------------------------------------------------------------------------------------- |
| GP (.gp / GP7) | alphaTab ScoreLoader | Original First light exercise: parsed/persisted; rendered and playback progressed in browser |
| GP3            | alphaTab ScoreLoader | Pending licensed fixture                                                                     |
| GP4            | alphaTab ScoreLoader | Pending licensed fixture                                                                     |
| GP5            | alphaTab ScoreLoader | Pending licensed fixture                                                                     |
| GPX            | alphaTab ScoreLoader | Pending licensed fixture                                                                     |

Extensions are accepted for validation, not advertised as universally compatible. An original GP7 multi-track fixture now covers guitar, five-string bass and drums at the parser/metadata layer. Browser validation of that fixture and repeat-rich fixtures remain necessary for a complete compatibility matrix. Actual iOS Safari, Android Chrome, Safari desktop and Firefox device/browser testing remains outstanding.

## Next

1. Expand licensed fixture coverage across historical formats, multiple instruments, repeats and complex arrangements.
2. Verify real iOS Safari and Android devices; mobile Chromium emulation does not establish real-device compatibility.
3. Add full-library backup/restore and improve storage durability messaging.
4. Continue authorised discovery research. Add external adapters only after permission and stable interface terms are established.
5. Consider chord diagrams, setlists and fretboard views once core reliability is demonstrated.

## Publication status

Published application commit: `a4714b208c0c3e24c192f07a678b62f8d8ff9b52`.

Live URL: https://broderickmiller.github.io/Fretless-Guitar-Tabs/

Verified successful [Actions run 41404952922](https://github.com/BroderickMiller/Fretless-Guitar-Tabs/actions/runs/41404952922): build, deploy and verify-production jobs all passed on 2 November 2026. The production browser job reported **4 passed (7.5s)**. The live HTML returned HTTP 200. Pages uses the GitHub Actions source with HTTPS enforced.

The initial connection permission denial was resolved through reauthorisation. The first CI run revealed a browser-test service-worker lifecycle wait error; the corrected test reloads after worker activation, then verifies cached navigation, notation and playback with network access disabled. No application features or checks were removed to obtain a passing deployment.

Production dependency audit: no vulnerabilities reported by `npm audit --omit=dev`. The full dependency tree reports development-tool transitive advisories without an available automatic fix; no forced dependency overrides were applied.

## URL imports — 0.2.0

Added pasted/dropped direct-file HTTPS imports, source links, cancellation, download limits, duplicate detection and Songsterr/Ultimate Guitar webpage guidance. Thirteen unit/component tests pass locally, including seven URL-service cases. Browser coverage now includes direct URL imports, persisted source attribution, duplicates and the user-supplied Songsterr link. CI gates deployment and then repeats the complete suite on the live site. Automatic Songsterr score copying is not implemented: Guitar Pro download is a Plus feature; Fretless guides users to the official download and subsequent file import.

URL-import deployment verified in [Actions run 41408293324](https://github.com/BroderickMiller/Fretless-Guitar-Tabs/actions/runs/41408293324), application commit `94cada223dbdef1a8ce7a0847c2990d24bd53ea0`: build, deploy and verify-production all passed. All 13 unit/component tests and eight desktop/mobile browser scenarios passed; the eight browser scenarios also passed against the deployed URL. Manual browser checks imported the original First light and Three piece GP7 exercises from public raw GitHub URLs, retained source links, and displayed guidance for the supplied Songsterr URL. Existing cached installations may need all Fretless tabs closed and reopened to activate the updated offline shell.
