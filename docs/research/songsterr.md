# Songsterr URL import assessment

Checked 2 November 2026 using the user-supplied [Sweet Child O' Mine page](https://www.songsterr.com/a/wsa/guns-n-roses-sweet-child-o-mine-tab-s23) and official [terms](https://www.songsterr.com/terms).

The supplied URL is a tab-player webpage, not a Guitar Pro download. Songsterr's terms list Guitar Pro downloads among Plus features and restrict automated circumvention of paid functionality. No external download API or authorisation for automated extraction was established.

Fretless recognises these page links locally, links users back to the original page, and offers file import after an official download obtained with appropriate access. It does not fetch Songsterr's score data or replay private download endpoints. Direct HTTPS Guitar Pro links from other hosts can be imported where browser CORS permissions allow it. Fetch uses no credentials and no referrer; original score bytes are parsed before saving locally.
