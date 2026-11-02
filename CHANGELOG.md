# Changelog

## 0.1.0 — 2 November 2026

- Established React, TypeScript, Vite and alphaTab application from an empty repository.
- Added local Guitar Pro library, validation, duplicate detection, search and filters.
- Added notation, playback and practice controls using score data.
- Added responsive accessible interface and optional light theme.
- Added offline PWA caching with locally hosted notation/audio assets.
- Added original GP7 test exercise, unit/component tests, browser acceptance tests and GitHub Pages deployment workflow.
- Began separate Ultimate Guitar/REA investigation; no unauthorised download adapter added.

- Published to GitHub Pages and verified all six unit/component tests and four desktop/mobile browser scenarios; the browser suite passed both before deployment and on the live site, including offline playback.

## 0.2.0 — 2 November 2026

- Added pasted and dropped HTTPS Guitar Pro URL imports with local persistence, deduplication and source attribution.
- Added provider-page guidance for Songsterr and Ultimate Guitar, including the official-download import route.
- Added bounded downloads, cancellation and clear errors for webpages, CORS/network failures, unsupported files and unavailable downloads.
- Added URL import unit and desktop/mobile browser coverage.

## 0.3.0 — 2 November 2026

- Added pasted ASCII tab conversion into playable GP7 notation, preserving original text for export and local storage.
- Added readable text/HTML URL conversion using inert page extraction.
- Added persistent grid/list library views, a recent-practice rail and recently-added sorting.
- Added settings for appearance, motion, notation and practice defaults, plus storage usage and confirmed library clearing.
- Added notation layouts/display selection, multi-track visibility/reset, section jumps, measure navigation, keyboard shortcuts and quick measure/whole-song loops.
- Adapted and tested the ASCII parser from the user's local MIT-licensed Fretless reference while retaining the published library schema.
