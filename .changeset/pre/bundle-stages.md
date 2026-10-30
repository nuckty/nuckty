---
"@nuckty/core": patch
---

The CSS stage no longer publishes an empty stylesheet for a bundle whose blocks have no CSS, matching the JS stage. The undocumented `.build/hash-css.json` and `.build/hash-js.json` files are no longer written; bundle records stay in `cssHash` and `jsHash` of the build store. An unreadable SVG referenced by CSS now fails the build instead of being skipped with a warning.
