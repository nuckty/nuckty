---
"@nuckty/core": minor
---

Alternates link only to sibling pages that exist in the sibling target's `sitemap.yml` and carry that page's title, so hreflang no longer points at missing pages. `resolveAlternates` takes the sibling pages by target name as its fourth argument instead of a title map.
