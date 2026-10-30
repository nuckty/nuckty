---
"@nuckty/core": patch
---

The generated `.htaccess` gives MP4 videos the same 10-year `Expires` as other hashed assets; before, they were marked immutable but expired under the host's default policy.
