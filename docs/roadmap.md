# Roadmap and verification

## Initial audit — 2 November 2026

The source repository had one `main` branch, one initial commit (`c34ed31`), and a two-line README. No application, dependencies, tests, prototypes, architecture documents or workflows existed. A clean React/Vite foundation was required. GitHub reported Pages present; publication configuration requires verification after the first workflow.

## Implemented foundation and practice controls

Local searchable library; validated multi-file import; IndexedDB; favourites/recent views; original-file download; responsive notation; real-score playback; speed/seek; track selection/mixer; measure loops; metronome/count-in; practice layout; PWA shell/audio caching; dark/light themes; GitHub Actions quality and deployment workflow.

TypeScript, ESLint, six Vitest tests and production build pass locally. The in-app browser has rendered the original GP7 exercise and shown advancing playback. Local standalone Playwright launch is blocked by macOS MachPortRendezvous permission restrictions; CI runs those tests on Ubuntu before deployment.

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

1. Complete deployed desktop/mobile browser and offline verification; resolve any CI or Pages configuration failures.
2. Expand licensed fixture coverage across historical formats, multiple instruments, repeats and complex arrangements.
3. Add full-library backup/restore and improve storage durability messaging.
4. Continue authorised discovery research. Add external adapters only after permission and stable interface terms are established.
5. Consider chord diagrams, setlists and fretboard views once core reliability is demonstrated.

## Publication status

Initial GitHub source upload was denied with HTTP 403, `Resource not accessible by integration`, on `POST /repos/BroderickMiller/Fretless-Guitar-Tabs/git/blobs`. No remote writes or deployment have completed. The target Pages URL returned HTTP 404 during the session. The installed GitHub app needs access to this repository with contents/workflow write permissions; local Git has no configured authentication.

Production dependency audit: no vulnerabilities reported by `npm audit --omit=dev`. The full dependency tree reports development-tool transitive advisories without an available automatic fix; no forced dependency overrides were applied.
