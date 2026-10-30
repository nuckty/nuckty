---
"@nuckty/ext-command-deploy-ftp": patch
---

deploy-ftp removes the server manifest before the first change, so an interrupted deploy is never compared against stale hashes; target selection uses the core rules.
