#!/usr/bin/env node
/**
 * nuckty CLI entry point.
 *
 *   nuckty <command> [target] [options]
 *
 * The core knows only `build`. Every other command is a command-extension
 * registered via `env.commands.add` (openspec `extensions` spec): the CLI loads
 * the consumer config, loads its `ext[]` extensions so they register commands,
 * then dispatches `build` to the core and any other command to its handler.
 *
 *   nuckty build [target]              build site(s); target optional (default: all)
 *   nuckty <ext-command> [args/flags]  dispatched to the registered handler
 *   nuckty --help | -h                 usage (lists registered commands)
 *
 * Targets are declared in config/config-nuckty.ts.
 */

const TAGLINE = 'All static site generators suck. This one just sucks less.';

import { parseArgs, validateCommandArgs } from './parse-args.js';

async function main(): Promise<void> {
    // Register the ESM loader (src/bin/loader.ts → dist/bin/loader.js) before any
    // dynamic import. It rewrites relative `.js` specifiers inside `.ts` modules
    // to their `.ts` sibling and transpiles `.ts` via esbuild, so the standalone
    // CLI can import the consumer `config-nuckty.ts` and `ext[]` `.ts` paths under
    // plain Node 24 — without tsx. `import.meta.url` is preserved by tsup's ESM
    // output; the loader sits next to this bin in `dist/bin/`.
    const { register } = await import('node:module');
    register(new URL('./loader.js', import.meta.url).href, import.meta.url);

    const argv = process.argv.slice(2);
    const parsed = parseArgs(argv);
    if (parsed.help) { await printHelp(); process.exit(0); }
    if (parsed.version) {
        const { readFile } = await import('node:fs/promises');
        const { version } = JSON.parse(await readFile(new URL('../../package.json', import.meta.url), 'utf8'));

        process.stdout.write(`nuckty ${version}\n`);
        process.exit(0);
    }
    if (argv.length === 0) { await printHelp(); process.exit(0); }
    // Every other token that does not start with `--` is the command.
    if (argv[0]!.startsWith('--')) {
        process.stderr.write('nuckty: command must appear before options\n');
        process.exit(1);
    }

    const cmd = parsed.positional[0]!;
    const cwd = process.cwd();

    // `build` takes an optional target and no options; the build entry point owns its single config load.
    if (cmd === 'build') {
        const [target] = checkedArgs(cmd, BUILD_COMMAND, parsed).positional;
        const { runBuild } = await import('../index.js');

        await runBuild({ command: 'build', cwd, ...(target === undefined ? {} : { target }) });
        return;
    }

    // Load extensions so command argument declarations are available before
    // parsing targets adjacent to boolean switches.
    const { loadConfig, NucktyEnv, loadPlugins } = await import('../index.js');
    const config = await loadConfig(cwd);
    const env = new NucktyEnv();
    await loadPlugins(env, config.ext ?? [], { cwd });
    const commands = env.commands;
    const entry = commands.get(cmd);
    if (!entry) {
        process.stderr.write(`nuckty: unknown command "${cmd}"\n`);
        usage(commands.list());
        process.exit(1);
    }
    const booleanFlags = Object.keys(entry.flags).filter((name) => entry.flags[name] === 'boolean');
    const commandArgs = checkedArgs(cmd, entry, parseArgs(argv, { booleanFlags }));
    const code = await entry.handler({ ...commandArgs, config, cwd });
    process.exit(code);
}

const BUILD_COMMAND = { flags: {}, maxPositionals: 1 };

/** Arguments after the command, validated against its declaration; an invalid set exits 1. */
function checkedArgs(
    cmd: string,
    command: Parameters<typeof validateCommandArgs>[0],
    parsed: ReturnType<typeof parseArgs>,
): ReturnType<typeof validateCommandArgs> {
    try {
        return validateCommandArgs(command, { positional: parsed.positional.slice(1), flags: parsed.flags });
    } catch (error) {
        process.stderr.write(`nuckty: ${cmd}: ${(error as Error).message}\n`);
        process.exit(1);
    }
}

function usage(commands: { name: string; description: string }[]): void {
    let out = `nuckty — ${TAGLINE}\n\nUsage:\n  nuckty <command> [args] [flags]\n\nCommands:\n  build [target]   build site(s) (core)\n`;
    for (const c of commands) {
        out += `  ${c.name}   ${c.description}\n`;
    }
    out += '\nTargets are declared in config/config-nuckty.ts.\n';
    process.stdout.write(out);
}

/** `--help` / no-args: load ext[] so registered commands are listed too. */
async function printHelp(): Promise<void> {
    let commands: { name: string; description: string }[] = [];
    try {
        const cwd = process.cwd();
        const { loadConfig, NucktyEnv, loadPlugins } = await import('../index.js');
        const config = await loadConfig(cwd);
        const env = new NucktyEnv();
        await loadPlugins(env, config.ext ?? [], { cwd });
        commands = env.commands.list();
    } catch {
        // If config/ext fail (no config, missing ext), still show the core usage.
    }
    usage(commands);
}

// Run unconditionally: this module is only the bin entry point, and comparing
// `import.meta.url` with `process.argv[1]` fails behind a `node_modules/.bin` symlink.
// Engine errors may already name the tool; print the prefix once.
main().catch((err) => {
    process.stderr.write(`nuckty: ${(err instanceof Error ? err.message : String(err)).replace(/^nuckty: /, '')}\n`);
    process.exit(1);
});
