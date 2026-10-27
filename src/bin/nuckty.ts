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

import { parseArgs } from './parse-args.js';

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
    const initial = parseArgs(argv);
    if (initial.help) { await printHelp(); process.exit(0); }
    if (initial.version) {
        const { readFile } = await import('node:fs/promises');
        const { version } = JSON.parse(await readFile(new URL('../../package.json', import.meta.url), 'utf8'));

        process.stdout.write(`nuckty ${version}\n`);
        process.exit(0);
    }

    if (argv[0]?.startsWith('--')) {
        process.stderr.write('nuckty: command must appear before options\n');
        process.exit(1);
    }

    const cmd = initial.positional[0];
    if (!cmd) {
        if (argv.length === 0) { await printHelp(); process.exit(0); }
        process.stderr.write('nuckty: command must appear before options\n');
        process.exit(1);
    }

    const parsed = parseArgs(argv);
    if (cmd === 'build') {
        const flagNames = Object.keys(parsed.flags);
        if (flagNames.length > 0) {
            process.stderr.write(`nuckty: build does not accept options: ${flagNames.map((name) => `--${name}`).join(', ')}\n`);
            process.exit(1);
        }
        if (parsed.positional.length > 2) {
            process.stderr.write('nuckty: build accepts at most one target argument\n');
            process.exit(1);
        }
    }

    // Load the engine. The build entry point owns its single config load.
    const cwd = process.cwd();
    const { loadConfig, runBuild, NucktyEnv, loadPlugins } = await import('../index.js');

    if (cmd === 'build') {
        const opts: { command: 'build'; cwd: string; target?: string } = { command: 'build', cwd };
        if (parsed.positional[1] !== undefined) opts.target = parsed.positional[1];
        await runBuild(opts);
        return;
    }

    // Load extensions so command argument declarations are available before
    // parsing targets adjacent to boolean switches.
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
    const { positional, flags } = parseArgs(argv, { booleanFlags: entry.booleanFlags });
    const rest = positional.slice(1);
    const code = await entry.handler({ positional: rest, flags, config, cwd });
    process.exit(code);
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

// This module is the bin entry point only (nothing else imports it — the pure
// `parseArgs` seam lives in `./parse-args.ts`). Run unconditionally: comparing
// `import.meta.url` with `pathToFileURL(process.argv[1])` silently skipped
// execution when invoked through an `node_modules/.bin` symlink, because Node
// resolves the module by its real path while argv keeps the symlink path
// (arch review RUNTIME-001).
main().catch((err) => {
    process.stderr.write(`nuckty: ${err instanceof Error ? err.message : String(err)}\n`);
    process.exit(1);
});

