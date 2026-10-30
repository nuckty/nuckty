# Alternates follow the sibling sitemaps

## Why

Alternates pointed at the same route on every sibling target without checking that the page exists there, so hreflang could lead to a 404, and their titles were always empty in a build.

## What Changes

- The HTML stage reads each sibling target's `sitemap.yml`; a route missing there gets no alternate, an existing one supplies its title.
- **BREAKING** `resolveAlternates` takes the sibling pages by target instead of a title map.
