---
"@nuckty/core": minor
"@nuckty/ext-command-content-external": minor
---

`config/external.json` entries may be objects `{ url, ref, path }`: content-external checks out the pinned tag or commit and keeps only the configured subdirectory. The core reads both entry forms and exports `parseExternalSources`.
