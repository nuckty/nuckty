# Command extension

A command extension adds a command to the CLI: `nuckty <command>`. The entry point is `env.commands`. Use it for actions beyond the built-in `build`: deploying to a server, local serving via `nuckty serve`, validity checks.

## API

```ts
interface NucktyEnv {
    commands: {
        add(name: string, description: string, handler: CommandHandler, options?: {
            booleanFlags?: readonly string[];
        }): void;
    };
}
```

`CommandHandler` is a function: it receives the parsed arguments and flags, runs the command, and returns an exit code.

## Example: target information

```ts
import process from 'node:process';
import type { NucktyEnv } from '@nuckty/core';

export function register(env: NucktyEnv): void {
    env.commands.add('target-info', 'show a configured target', async (args) => {
        const names = Object.keys(args.config.targets);
        const name = args.positional[0] ?? names[0];
        const target = name === undefined || !Object.hasOwn(args.config.targets, name)
            ? undefined
            : args.config.targets[name];

        if (target === undefined) {
            process.stderr.write('Unknown or missing target\n');
            return 1;
        }
        const output = args.flags['json'] === true
            ? JSON.stringify({ name, ...target }, null, 2)
            : `${name}: ${target.outDir}`;
        process.stdout.write(output + '\n');
        return 0;
    }, { booleanFlags: ['json'] });
}
```

Save the module as `ext/target-info.ts` and add `'./ext/target-info.ts'` to `ext` in the global configuration. The user runs:

```bash
npx @nuckty/core target-info --json
```

The handler prints the first [target](../targets.md). To choose another, supply its name: `npx @nuckty/core target-info main --json`, where `main` is a name from your configuration. The example accepts an optional name and the `--json` flag; additional argument validation can be added in the handler.

## Handler contract

The handler receives:

- `args.positional` — positional arguments ([targets](../targets.md), paths).
- `args.flags` — a flags object keyed without `--`. Register flags that take no value in `options.booleanFlags`; these flags leave the next token positional. Other flags keep the generic `--name value` form. Both forms support `--name=value`, and `--` ends option parsing. For example, with `booleanFlags: ['dry-run']`, `nuckty deploy-ftp --dry-run staging` yields `positional = ['staging']` and `flags['dry-run'] = true`.
- `args.config` — the user configuration, already loaded by the core, and `args.cwd` — the project root.

It returns an exit code: `0` for success, a non-zero code for an error. The core passes this code to the process.

## Typical commands

- **`nuckty deploy-ftp [target]`** — deploy the artifact to a server. See [`@nuckty/ext-command-deploy-ftp`](../../ext/command/deploy-ftp.md).
- **`nuckty serve [--port N]`** — serve the site locally via nginx. See [`@nuckty/ext-command-serve`](../../ext/command/serve.md).
- **`nuckty validate`** — check [HTML](../../out/html.md) with an external validator. See [`@nuckty/ext-command-validate-vnu`](../../ext/command/validate-vnu.md).

## When to choose command

If the action is a standalone operation on the finished artifact (deploying, serving via `nuckty serve`, validation), it is a `command`. If the action changes the build process itself, it is a [pipeline extension](pipeline.md).

## Command extension catalog

Ready-made command extensions are collected in the [catalog](../../ext/command.md).
