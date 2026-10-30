---
"@nuckty/core": minor
"@nuckty/ext-command-content-external": patch
"@nuckty/ext-command-deploy-ftp": patch
---

`externalRepoName` rejects URLs whose last segment is empty or not a plain directory name, and `content-external` uses it instead of its own parser. `generateFileHash` is exported, and `deploy-ftp` verifies local files with it instead of a copy of the manifest hash.
