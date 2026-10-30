/**
 * @nuckty/ext-command-deploy-ftp — `nuckty deploy-ftp [target]` command-extension.
 *
 * Registers the `deploy-ftp` CLI command: manifest-driven FTP/FTPS deploy of
 * the selected target's outDir (basic-ftp, no SSH). FTP delivery belongs to
 * this extension; the core does not depend on basic-ftp.
 *
 * @module @nuckty/ext-command-deploy-ftp
 */

import path from 'node:path';
import process from 'node:process';
import { resolveTarget, type NucktyEnv, type CommandArgs } from '@nuckty/core';
import type { DeployOpts, DeployResult } from './ftp.js';

export type FtpDeploy = (options: DeployOpts) => Promise<DeployResult>;

/** `nuckty deploy-ftp [target] [--force] [--allow-mass-delete] [--dry-run]` — deploy the built site over FTP. */
export async function deployFtp(args: CommandArgs, inject?: { ftpDeploy?: FtpDeploy }): Promise<number> {
    // Lazy-import the ftp logic so `register(env)` does not pull `basic-ftp` —
    // only an actual `nuckty deploy-ftp` invocation pays that import cost (and
    // needs basic-ftp installed in the consumer, not the core).
    const target = args.positional[0];
    const force = args.flags['force'] === true;
    const allowMassDelete = args.flags['allow-mass-delete'] === true;
    const dryRun = args.flags['dry-run'] === true;

    // An unknown target fails before basic-ftp is imported or a connection opens.
    let outDir: string;
    try {
        outDir = resolveOutDir(args.config, target, args.cwd);
    } catch (e) {
        process.stderr.write(`nuckty: deploy-ftp failed: ${(e as Error).message}\n`);
        return 1;
    }
    try {
        const ftpDeploy = inject?.ftpDeploy ?? (await import('./ftp.js')).ftpDeploy;
        const result = await ftpDeploy({
            outDir,
            cwd: args.cwd,
            force,
            allowMassDelete,
            dryRun,
            progress: true,
        });
        process.stdout.write(
            `nuckty: deploy-ftp — ${result.stats.uploaded} uploaded, ${result.stats.deleted} deleted\n`,
        );
        return result.stats.errors === 0 ? 0 : 1;
    } catch (e) {
        process.stderr.write(`nuckty: deploy-ftp failed: ${(e as Error).message}\n`);
        return 1;
    }
}

/**
 * Resolve the target's `outDir` from the loaded config with the core target
 * rules: no argument selects the first declared target, and an explicit
 * unknown name is a hard error, so a typo never deploys another target's
 * artifact. There is no implicit `site/` fallback.
 */
export function resolveOutDir(
    config: CommandArgs['config'],
    target: string | undefined,
    cwd: string,
): string {
    const t = resolveTarget({ ...config, targets: config.targets ?? {} }, target);
    if (typeof t.outDir !== 'string' || t.outDir.trim() === '') {
        throw new Error(`nuckty: target "${t.name}" must declare a nonempty outDir`);
    }

    return path.resolve(cwd, t.outDir);
}

export function register(env: NucktyEnv): void {
    env.commands.add(
        'deploy-ftp',
        'deploy the built site over FTP/FTPS',
        deployFtp,
        { flags: { force: 'boolean', 'allow-mass-delete': 'boolean', 'dry-run': 'boolean' }, maxPositionals: 1 },
    );
}

export default register;
