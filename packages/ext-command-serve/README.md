# @nuckty/ext-command-serve

Serve a built nuckty target locally through nginx. The extension registers `serve` and `stop` through `env.commands`.

The process lifecycle uses POSIX tools (`which`, `ps`, signals). Native Windows support is not verified.

## Usage

Install as a devDependency and add `'@nuckty/ext-command-serve'` to `ext` in `config-nuckty.ts`. A built target and `nginx` in `PATH` are required.

```bash
npx @nuckty/core build
npx @nuckty/core serve            # http://127.0.0.1:8080
# Or: npx @nuckty/core serve --port 8081
# In a second terminal in the same directory:
npx @nuckty/core stop
```

`nuckty serve [target] [--port N]` selects the target, checks its HTML directory, writes `.build/serve/<target>/nginx.conf` for that artifact, and starts nginx in the foreground. It binds to loopback; the default port is 8080. The runtime configuration uses the core hosting generator for routing, compression and image negotiation.

Without a target name, the first declared target is selected. The port must be an integer from 1 to 65535. Preview configuration is generated afresh and does not automatically include hooks that changed the build's `nginx.conf`, or Apache settings.

`nuckty stop [target]` reads `.build/serve/<target>/nginx.pid`, checks the process command and start time twice, and sends `QUIT` only to a recognized instance; without a target it stops every declared target's preview. Invalid, foreign or reused PIDs fail without a signal. Each target owns its PID, configuration and logs under `.build/serve/<target>/`, so targets can be served at once on different ports. Build cleanup preserves `.build/serve/`, allowing a preview to be stopped after a rebuild.

Validation daemons belong to the validate extension and are stopped by `nuckty validate` itself. There is no `env.daemons` registry.

## Specification

See the core `ext-command-serve` specification in `openspec/specs/ext-command-serve/spec.md`. Unit tests exercise lifecycle and process identity; the presence of nginx is a separate native integration prerequisite. Native command integration tests require nginx on PATH and run with `NUCKTY_SERVE_NATIVE=1 npm test`. CI requires this mode; the native scenario is explicitly skipped otherwise.

## License

MIT.
