# Reference feature comparison

Inspected 2 November 2026: `http://localhost:5173/#/`, served from the user's `Documents/Default Project` directory. Inspected its UI, README, import services, library/settings/player components and relevant tests. The source is MIT licensed to Broderick Miller. Its 720-line ASCII conversion service was adapted with explicit limits and timing warnings. The reference project was not modified.

| Reference capability | Integration in this project |
| --- | --- |
| Paste tab text, optional title, playable conversion | Inline Paste tab text form, title/artist fields, GP7 conversion and original text export |
| Public plain-text/HTML tab links | Existing URL importer extended with inert extraction and the same parser |
| Grid/list view and recently opened rail | Persistent view choice and Continue practising rail |
| Search, favourites, instrument/tuning/format filters | Preserved; text filter and recently-added sort added |
| Saved theme, motion, notation and practice defaults | Settings page, validated preferences and legacy theme migration |
| Storage usage and clear library | Original-file byte count, optional browser quota and two-step clear confirmation |
| Page/line and notation/tab/both view | Player controls and settings defaults |
| Multiple visible tracks, mute/solo/volume, reset | Visibility checkboxes added to existing mixer; mix/reset controls preserved |
| Current bar, previous/next, quick loops | Measure indicator/navigation, current-measure and whole-song looping |
| Keyboard practice controls | Space, Escape, arrows, brackets, L and M; typing excluded |
| Notation/playback, practice mode, offline use | Existing alphaTab engine and PWA retained; converted files follow the same storage and offline path |

The current design and IndexedDB `fretless` version-1 record format are retained. New metadata fields are optional, so existing imported files and favourites remain readable. Reference-specific visual components, hash-routing implementation and storage internals were not copied wholesale.

Text rhythm is an approximation, not a faithful transcription of timing absent from the source. Conversion groups different tunings into separate tracks and warns users to play them separately. Expressive tab markings are not fully reconstructed. Protected provider downloads are not bypassed. Guitar Pro format compatibility claims remain limited to the project's verified fixtures.
