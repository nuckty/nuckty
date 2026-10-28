# Command extensions

The catalog of `command`-type extensions — those that add CLI commands via `env.commands.add(...)`. The nuckty core ships only `build`; all other commands come from extensions.

## How it works

A command extension registers a command:

```ts
export function register(env) {
    env.commands.add('deploy-ftp', 'deploy the built site over FTP/FTPS', deployHandler);
}
```

The description string is shown in `nuckty --help`.

The full contract is in the [command extension guide](../how/ext/command.md).

## Registry

| Package | Command | Purpose |
|---|---|---|
| [`@nuckty/ext-command-deploy-ftp`](command/deploy-ftp.md) | `nuckty deploy-ftp` | Deploy the artifact to shared [hosting](../out/hosting.md) over FTP |
| [`@nuckty/ext-command-convert-images`](command/convert-images.md) | `nuckty convert-images` | Encoding [images](../out/images.md) to AVIF/WebP |
| [`@nuckty/ext-command-content-external`](command/content-external.md) | `nuckty content-external` | Content from external git repositories |
| [`@nuckty/ext-command-serve`](command/serve.md) | `nuckty serve`, `nuckty stop` | Local site serving via nginx, daemon shutdown |
| [`@nuckty/ext-command-validate-vnu`](command/validate-vnu.md) | `nuckty validate` | [HTML](../out/html.md) validation with the external W3C Nu Checker |

Add the extension you need to `config-nuckty.ts` to wire up its command.
