# Architecture

React/TypeScript and Vite provide the application shell. Modern CSS implements responsive layouts and local system typography. The shell lazy-loads the score player and alphaTab module, keeping the initial library lightweight.

`src/services/import.ts` validates extension and size, parses the bytes with alphaTab, derives title/artist/track metadata, and hashes the original bytes with SHA-256. The hash is the record ID, preventing repeat imports under different filenames. Files are imported sequentially, retaining successful imports when another fails.

`src/storage/library.ts` wraps IndexedDB through idb. Records contain original ArrayBuffers and metadata. File bytes never enter LocalStorage. Save failures are surfaced to the user. Theme preferences are optional and tolerate unavailable LocalStorage.

`src/providers/local.ts` implements the first `TabProvider` adapter. External adapters can implement the same interface and should be independently registered only when authorised. No remote provider is currently registered; there is no backend or silent upload.

`src/components/Player.tsx` creates and destroys an alphaTab API instance for the selected score. The built-in synthesiser uses the real score MIDI data with the bundled Sonivox SoundFont. Track mix, measure boundaries, tempo and tuning come from the parsed score. Loop controls use actual master-bar MIDI ticks; seek uses milliseconds. Notation and playback errors surface inline.

The official alphaTab Vite plugin emits workers/worklets and copies fonts and audio. All URLs use Vite BASE_URL. Vite PWA/Workbox precaches the shell, dynamic modules, notation fonts and SoundFont, enabling cold offline reopening once installation completes. Updates use the PWA prompt strategy; the previous worker remains in use until browser sessions close, avoiding a forced reload during practice.

Tests cover real GP7 parsing, original-byte persistence, deduplication, corrupt inputs, search, favourites and component interaction. Playwright tests cover desktop/mobile import, notation, playback progress, controls, reload persistence and offline reopening. iPhone-sized Chromium is viewport coverage, not real iOS Safari validation.

Storage is browser-local and subject to browser eviction. Individual-file export is implemented; full-library backup/restore is future work. Large scores can still take time to render; imports are limited to 30 MB each.

URL imports are implemented in `src/services/url-import.ts`. Only HTTPS URLs without embedded credentials are accepted. Fetch omits cookies and referrers; byte streams enforce the same 30 MB import limit before alphaTab validation. Source attribution excludes URL queries/fragments. Provider webpages are recognised locally and produce official-download guidance without scraping. Browser tests exercise deterministic direct-file fetches and the supplied Songsterr page drop, alongside the existing playback/offline suite.
