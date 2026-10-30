---
"@nuckty/core": patch
"@nuckty/ext-command-serve": patch
"@nuckty/ext-command-deploy-ftp": patch
---

CLI errors carry the `nuckty:` prefix once: an engine error such as an unknown target, a missing nginx in `serve` and a target without `outDir` in `deploy-ftp` no longer print `nuckty: nuckty:`.
