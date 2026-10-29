---
"@nuckty/core": patch
---

`external/` is always a protected input, so an `outDir` inside it is rejected before the clean stage even without `external.json`.
