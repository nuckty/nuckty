# @nuckty/ext-command-serve

Local serving of the built site through nginx with a [generated configuration](../../out/hosting.md). The `nuckty serve` and `nuckty stop` commands.

## Type

[command](../../how/ext/command.md) — adds the `serve` and `stop` commands via `env.commands`.

## What it does

`nuckty serve [target] [--port N]`:

1. Selects the target and checks its [HTML](../../out/html.md) directory.
2. Finds `nginx` in `PATH`.
3. Writes `.build/serve/<target>/nginx.conf` for that artifact and port (8080 by default).
4. Starts nginx in the foreground, listening on `127.0.0.1`.

`nuckty stop [target]` reads `.build/serve/<target>/nginx.pid`, checks the process command and start time twice, and sends `kill -QUIT` only to the recognized instance. Without a target it stops the previews of every declared target. Each target keeps its own PID, configuration and logs in `.build/serve/<target>/`, so several targets can be served at once on different ports; build cleanup retains `.build/serve/`. An unrelated, reused or invalid PID is refused without signaling.

The validation extension stops its own vnu daemon after `nuckty validate`.

## Why track the PID

A developer’s machine may also run nginx for the system or other projects. `nuckty stop` therefore uses the recorded PID and checks process identity before stopping it; a mismatch makes it refuse to terminate the process.

## Local serving

Preview uses the core generator for routing, [compression](../../out/compression.md), and image selection. Its configuration is generated afresh: build hooks that change `nginx.conf` and Apache rules are not carried over automatically. Local nginx checks do not certify production hosting configuration.

Without a name, the first target is selected. The port is an integer from 1 to 65535. The command runs in the foreground; run `nuckty stop` from a second terminal in the same directory. POSIX tools are required; native Windows is not verified.

## Development only

Install this extension as a development dependency (`devDependency`) for local preview. CI can also use it for integration checks against real nginx.

## Installation

This example extends the quickstart with the standard `@nuckty/ext-block-root` document handler. Add the new extension to `ext` in the global `config/config-nuckty.ts`, retaining the other entries. If you use a custom document handler, keep its registration instead of `@nuckty/ext-block-root`.

Install the extension from npm in the extracted [starter project](../../how/start.md):

```bash
npm install --save-exact --save-dev @nuckty/ext-command-serve@1.0.0-rc.5
```

```ts
import { defineNucktyConfig } from '@nuckty/core';

export default defineNucktyConfig({
    targets: { main: { configDir: 'config/', outDir: 'site/' } },
    ext: ['@nuckty/ext-block-root', '@nuckty/ext-command-serve'],
});
```

It requires `nginx` in `PATH` (locally, via Homebrew or a system installation).
