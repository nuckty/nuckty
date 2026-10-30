# Serve each target with its own runtime files

## Why

`serve` kept one PID file and one configuration per project, so two targets could not be previewed at once, and `stop` accepted no target although the demo documented `nuckty stop en`.

## What Changes

- Each target's preview uses `.build/serve/<target>/` for its configuration, PID and logs; build cleanup preserves `.build/serve/`.
- `nuckty stop [target]` stops one target's preview, or every declared target's preview without an argument.
- `serve` no longer requires the build's `nginx.conf`; it checks the selected artifact only.
