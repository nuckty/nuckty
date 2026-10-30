---
"@nuckty/core": patch
"@nuckty/ext-command-convert-images": minor
---

The images stage skips hidden directories and `node_modules`, like the assets stage; the filter is exported as `isToolingDirectory`. `convert-images` requires the content directory argument and skips the same directories, so it no longer scans dependencies or built output.
