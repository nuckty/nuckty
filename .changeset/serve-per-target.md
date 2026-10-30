---
"@nuckty/core": patch
"@nuckty/ext-command-serve": minor
---

Each target's preview keeps its configuration, PID and logs in `.build/serve/<target>/`, so several targets can be served at once. `nuckty stop [target]` stops one target's preview, or every target's without an argument; `npm run stop:en` in the demo works again. `serve` no longer requires the build's `nginx.conf`.
