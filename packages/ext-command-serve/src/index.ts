import { execFile, spawn } from 'node:child_process';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import type { NucktyEnv, CommandArgs } from '@nuckty/core';

/** Runtime directory of one target's preview: configuration, PID and logs. Build cleanup preserves `.build/serve/`. */
export function runtimeDirFor(cwd: string, target: string): string {
    return path.join(cwd, '.build', 'serve', target);
}

/** `nuckty serve [target] [--port N]` starts the selected built artifact. */
export async function serve(args: CommandArgs, runtime: {
    spawn?: typeof spawn;
    resolveNginx?: () => Promise<string>;
} = {}): Promise<number> {
    try {
        const rawPort = args.flags['port'];
        const port = rawPort === undefined ? 8080 : typeof rawPort === 'string' && /^\d+$/.test(rawPort) ? Number(rawPort) : NaN;
        if (!Number.isInteger(port) || port < 1 || port > 65535) {
            throw new Error('Port must be an integer between 1 and 65535');
        }

        const { resolveTarget, generateNginxConfig, assertArtifactPath } = await import('@nuckty/core');
        const target = resolveTarget(args.config, args.positional[0]);
        const outDir = path.resolve(args.cwd, target.outDir);
        await fs.access(path.join(outDir, 'html'));
        const consumerRoot = await fs.realpath(args.cwd);
        const runtimeDir = runtimeDirFor(args.cwd, target.name);
        const confPath = path.join(runtimeDir, 'nginx.conf');
        const pidFile = path.join(runtimeDir, 'nginx.pid');
        const logDir = path.join(runtimeDir, 'logs');

        for (const destination of [runtimeDir, confPath, pidFile, logDir,
            path.join(logDir, 'nuckty_access.log'), path.join(logDir, 'nuckty_error.log')]) {
            await assertArtifactPath(consumerRoot, path.resolve(consumerRoot, path.relative(args.cwd, destination)));
        }
        try {
            const existingPid = Number((await fs.readFile(pidFile, 'utf8')).trim());
            if (!Number.isInteger(existingPid) || existingPid <= 0 || await inspectProcess(existingPid)) {
                throw new Error('nginx pid file is active or invalid; stop the existing server first');
            }
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
                throw error;
            }
        }
        const nginxBin = await (runtime.resolveNginx ?? resolveNginxBin)();
        await fs.mkdir(logDir, { recursive: true });
        await fs.writeFile(confPath, generateNginxConfig(outDir, 'nuckty', pidFile, port, logDir));
        const child = (runtime.spawn ?? spawn)(nginxBin, ['-c', confPath, '-g', 'daemon off;'], { stdio: 'inherit' });
        return await new Promise<number>((resolve) => {
            child.on('exit', (code, signal) => resolve(signal ? 1 : code ?? 1));
            child.on('error', () => resolve(1));
        });
    } catch (error) {
        process.stderr.write(`nuckty: serve failed: ${(error as Error).message}\n`);
        return 1;
    }
}

/** `nuckty stop [target]` stops the preview of one target, or of every target without an argument. */
export async function stop(args: CommandArgs, options: StopOptions = {}): Promise<number> {
    let targets: string[];

    try {
        const { resolveTarget, allTargets } = await import('@nuckty/core');
        targets = args.positional[0] === undefined
            ? allTargets(args.config).map((target) => target.name)
            : [resolveTarget(args.config, args.positional[0]).name];
    } catch (error) {
        process.stderr.write(`nuckty: stop failed: ${(error as Error).message}\n`);
        return 1;
    }
    let failed = false;

    for (const target of targets) {
        const result = await killNginxByPid({
            ...options,
            pidFile: path.join(runtimeDirFor(args.cwd, target), 'nginx.pid'),
        });
        if (result === 'sent') {
            process.stdout.write(`nuckty: sent nginx graceful stop signal to "${target}"\n`);
        } else if (result === 'failed') {
            process.stderr.write(`nuckty: could not stop owned nginx process of "${target}"\n`);
            failed = true;
        }
    }

    return failed ? 1 : 0;
}

export interface KillSpawn {
    on(event: 'exit' | 'error', listener: (code?: number | Error | null) => void): void;
}

export interface StopOptions {
    spawnKill?: (command: string, args: string[]) => KillSpawn;
    inspectProcess?: (pid: number) => Promise<string | null>;
    reapDelayMs?: number;
    pidFile?: string;
}

/** Inspect the command and start timestamp together; refusal never signals a PID. */
function inspectProcess(pid: number): Promise<string | null> {
    const psEnv = { ...process.env };
    if (psEnv.LC_ALL) {
        // LC_ALL otherwise overrides LC_TIME; copy its effective character
        // encoding before removing the override for the English start time.
        psEnv.LC_CTYPE = psEnv.LC_ALL;
    }
    delete psEnv.LC_ALL;
    psEnv.LC_TIME = 'C';
    if (!/(?:^|\.)UTF-?8(?:@|$)/i.test(psEnv.LC_CTYPE || psEnv.LANG || '')) {
        // Keep non-ASCII config paths intact even when the inherited locale is
        // C or another non-UTF-8 encoding.
        psEnv.LC_CTYPE = 'C.UTF-8';
    }

    return new Promise((resolve, reject) => {
        execFile('ps', ['-ww', '-p', String(pid), '-o', 'lstart=', '-o', 'command='], { timeout: 2_000, env: psEnv }, (error, stdout) => {
            if (error && !stdout.trim()) {
                if ('code' in error && error.code === 1) {
                    resolve(null);
                } else {
                    reject(error);
                }
                return;
            }
            resolve(stdout.trim() || null);
        });
    });
}

export async function killNginxByPid(options: StopOptions = {}): Promise<'absent' | 'sent' | 'failed'> {
    const pidFile = options.pidFile;
    if (!pidFile) {
        return 'failed';
    }
    let pidStr: string;
    try {
        pidStr = (await fs.readFile(pidFile, 'utf8')).trim();
    } catch (error) {
        return (error as NodeJS.ErrnoException).code === 'ENOENT' ? 'absent' : 'failed';
    }
    const pid = Number(pidStr);
    if (!Number.isInteger(pid) || pid <= 0) {
        return 'failed';
    }
    const inspect = options.inspectProcess ?? inspectProcess;
    try {
        const identity = await inspect(pid);
        if (!identity) {
            return 'absent';
        }
        const configDir = path.dirname(pidFile);
        const argument = ` -c ${path.join(configDir, 'nginx.conf')}`;
        const matchesConfig = identity.endsWith(argument) || identity.endsWith(`${argument} -g daemon off;`);
        if (!/^[A-Za-z]{3} [A-Za-z]{3}\s+\d{1,2} \d{2}:\d{2}:\d{2} \d{4}\s+nginx: master process (?:\S*\/)?nginx\s/.test(identity) || !matchesConfig) {
            return 'failed';
        }
        if (await inspect(pid) !== identity || (await fs.readFile(pidFile, 'utf8')).trim() !== pidStr) {
            return 'failed';
        }
        const spawnKill = options.spawnKill ?? ((command, args) => spawn(command, args, { stdio: 'ignore' }));
        const sent = await new Promise<boolean>((resolve) => {
            const timer = setTimeout(() => resolve(false), 2_000);
            const done = (ok: boolean): void => {
                clearTimeout(timer);
                resolve(ok);
            };
            const child = spawnKill('kill', ['-QUIT', String(pid)]);
            child.on('exit', (code) => done(code === 0));
            child.on('error', () => done(false));
        });
        // Nginx owns its pid file and removes it only when termination completes.
        return sent ? 'sent' : 'failed';
    } catch {
        return 'failed';
    }
}

/** Resolve the nginx binary on PATH, throwing a clear message if missing. */
function resolveNginxBin(): Promise<string> {
    return new Promise((resolve, reject) => {
        const p = spawn('which', ['nginx'], { stdio: ['ignore', 'pipe', 'pipe'] });
        let out = '';
        p.stdout.on('data', (d) => { out += d.toString(); });
        p.on('exit', (code) => {
            const bin = out.trim();
            if (code === 0 && bin) {
                resolve(bin);
            } else {
                reject(
                    new Error(
                        'nuckty: nginx not found on PATH. Install nginx to use `nuckty serve`.',
                    ),
                );
            }
        });
        p.on('error', () => {
            reject(
                new Error(
                    'nuckty: nginx not found on PATH. Install nginx to use `nuckty serve`.',
                ),
            );
        });
    });
}

export function register(env: NucktyEnv): void {
    env.commands.add('serve', 'serve the built site locally', serve, { flags: { port: 'string' }, maxPositionals: 1 });
    env.commands.add('stop', 'stop the local preview of a target, or of every target', stop, { maxPositionals: 1 });
}

export default register;
