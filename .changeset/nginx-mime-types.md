---
"@nuckty/core": patch
---

The generated nginx configuration includes the installed `mime.types`, including Homebrew on Intel Macs, instead of assuming the Apple silicon path outside Linux.
