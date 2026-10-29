---
"@nuckty/core": patch
"@nuckty/ext-command-content-external": patch
---

content-external resolves `ref` to a tag or commit, accepts tags moved upstream, skips fetching a present commit, verifies `path` and refuses before changing the copy; partial clones fetch only their blobs and LFS files. The core exports `externalRepoName`, used for every external directory.
