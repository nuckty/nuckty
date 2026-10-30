---
"@nuckty/core": patch
---

The generated nginx and Apache configurations no longer route extensionless `_c…`, `_j…` and `_s…` files, compression no longer selects them, and only `_i…` page URLs stay reserved: the build never produces such files. The negotiated image location no longer probes a `.ico` variant.
