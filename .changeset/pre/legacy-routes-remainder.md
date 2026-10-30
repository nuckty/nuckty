---
"@nuckty/core": patch
---

The generated nginx configuration no longer routes extensionless `_s…`, `_c…` and `_j…` files, and `.htaccess` no longer probes a `.ico` variant for `/_i…` image URLs or sets a content type for `_s…` files: the build never produces them.
