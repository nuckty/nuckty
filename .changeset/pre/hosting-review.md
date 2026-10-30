---
"@nuckty/core": patch
---

Apache answers missing routes with the site's `/404` page and blocks encoded or dot-segment requests to `brotli/`, `gzip/` and `.html` files; nginx no longer marks pages such as `/_start` or URLs with an image-like query as immutable assets, and hashed assets send one immutable Cache-Control value.
