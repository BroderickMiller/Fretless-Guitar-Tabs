# Ultimate Guitar investigation

Investigated 2 November 2026. No Ultimate Guitar adapter is enabled in Fretless.

## Scope and method

Read the official [REA repository](https://github.com/morluto/rea), README and browser scenario contract. Installed REA 6.8.0 into a separate `work/rea-runtime` environment, outside Fretless. REA supports passive browser observation, saved network-capture inspection and inert JavaScript application analysis. It is not an application dependency.

Retrieved one logged-out public [search page](https://www.ultimate-guitar.com/search.php?search_type=title&value=public%20domain) and the [service terms](https://www.ultimate-guitar.com/about/tos.htm); both returned HTTP 200. Parsed only public search metadata. Downloaded the page's referenced `ug.0f43faa62c462aa1738ffb9139565196.js` bundle for local static inspection. No authentication, credential extraction, private endpoints, bulk requests, or file downloads were used.

REA static analysis initially failed because its macOS ownership helper attempted to compile into a sandbox-restricted Swift module cache. A subsequent attempt with a workspace-local compiler cache failed at the same helper compilation step; no successful REA semantic analysis is claimed. Browser network capture has not yet been completed; the local standalone Chromium launch is separately restricted by macOS Mach bootstrap permissions. Public HTML and bundle observations below do not depend on successful REA semantic reconstruction.

## Observations

1. Public search uses `search.php` with query parameters. The retrieved HTML contains a `js-store` element with JSON in `data-content`; search data resides at `store.page.data`.
2. Observed fields: `search_query`, `results_count`, `results`, `pagination`, `filters`. Result objects include `id`, `song_id`, `song_name`, `artist_id`, `artist_name`, `type`, `version`, `votes`, `rating`, `status`, `tab_access_type` and `tab_url`.
3. The sampled results have `type: Chords` and `tab_access_type: public`. A filter exposes `type=300` for Chords. No numeric Guitar Pro mapping was verified in this sample. The public bundle contains separate visible labels for Pro, Guitar Pro, Tab, Bass Tabs, Drum Tabs and Official; those labels must not be conflated.
4. The supplied `tab_url` is a usable attribution/deep-link target. A metadata adapter could preserve that URL if an authorised integration is agreed.
5. Searchability does not establish a download licence or third-party API contract. No documented, authorised search API or third-party Guitar Pro download permission was established in this investigation.
6. The terms' sections 6.2 and 7 restrict copying/distribution and describe service-specific rights. These findings are the basis for withholding a scraping/download adapter, rather than assuming discoverable interfaces can be used. This is an implementation decision, not a legal opinion.
7. Whether particular Guitar Pro files can legitimately be downloaded without a subscription remains unverified. No universal claim is made. Logged-in availability and subscription checks were not investigated, since no authorised account session was supplied.

The search phrase “public domain” returned songs with those words in their titles. It does **not** establish that those songs or arrangements are public-domain works. No such files were imported or redistributed.

## Reproduction

Use a single public request, without account cookies:

```sh
curl -L 'https://www.ultimate-guitar.com/search.php?search_type=title&value=public%20domain' -o search.html
```

Parse the HTML with an HTML parser, locate `data-content` on `js-store`, JSON-decode it and inspect `store.page.data`. Do not preserve the complete store in the repository: it also contains unrelated site configuration and ephemeral identifiers. Source URLs and selected metadata field names are sufficient for the current result. Future tests should use synthetic metadata matching the observed schema, not copied arrangements.

REA static command used against the single downloaded public bundle:

```sh
rea analyze-javascript-application ./public-bundle --analysis-timeout-ms 20000 --detail summary --evidence_output ./ug-bundle-evidence.json --format json
```

## Integration decision and next work

Local imports remain the working provider. Keep Ultimate Guitar disabled. User-provided files must be obtained under rights that permit their use; Fretless provides no remote extraction path. Next steps are to establish provider permission and published terms for an API, then capture permitted logged-out browser search traffic with bounded observations and add a separately enabled adapter. If no stable authorised interface is available, source links and appropriately licensed imports remain the alternative.
