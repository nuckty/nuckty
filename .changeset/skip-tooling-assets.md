---
"@nuckty/core": patch
---

The asset stage skips hidden directories and `node_modules` of external repositories, so tooling files such as `.venv/db.ini` are never published.
