import path from 'node:path';
import { Pipeline, type BuildContext } from './pipeline/pipeline.js';
import { NucktyEnv } from './env/env.js';
import { loadPlugins } from './env/loader.js';
import { loadConfig } from './env/config.js';
import { allTargets, resolveTarget, type NucktyConfig, type Target } from './targets/config.js';
import { registerDefaultStages, finalizeArtifact } from './stages/index.js';
import { loadBlocks } from './blocks/loader.js';
import { loadBuildConfig, type BuildConfigSnapshot } from './utils/build-config.js';
import { preflightOutDirs } from './utils/outdir-preflight.js';
import { externalRepoName } from './utils/external.js';
import { Templates } from './bem/templates.js';

export interface BuildCommand {
    command: 'build';
    target?: string;
    cwd: string;
}

/**
 * Run the `nuckty build` command: resolve target(s), load extensions, and run
 * the pipeline for each target.
 */
export async function runBuild(cmd: BuildCommand): Promise<void> {
    const config = await loadConfig(cmd.cwd);
    await runBuildTargets(config, cmd);
}

async function runBuildTargets(config: NucktyConfig, cmd: BuildCommand): Promise<void> {
    const targets: Target[] = cmd.target !== undefined
        ? [resolveTarget(config, cmd.target)]
        : allTargets(config);

    if (targets.length === 0) {
        throw new Error('nuckty: build requires at least one target');
    }

    const declaredTargets = allTargets(config);
    preflightOutDirs(cmd.cwd, targets, declaredTargets.map((target) => target.configDir));
    const snapshots = new Map(declaredTargets.map((target) => [target.name, loadBuildConfig(cmd.cwd, target.configDir)]));
    const prepared: Array<{ target: Target; env: NucktyEnv; snapshot: BuildConfigSnapshot }> = [];
    const inputs = declaredTargets.flatMap((target) => {
        const snapshot = snapshots.get(target.name)!;
        const externalDirs = (snapshot.externalUrls ?? []).map((url) => path.join('external', externalRepoName(url) || url));
        return [target.configDir, ...snapshot.levels, ...externalDirs];
    });

    for (const target of targets) {
        const env = new NucktyEnv();
        await loadPlugins(env, config.ext ?? [], { cwd: cmd.cwd });
        const snapshot = snapshots.get(target.name)!;
        for (const level of snapshot.levels) {
            env.levels.add(level);
        }
        inputs.push(...env.levels.list());
        prepared.push({ target, env, snapshot });
    }
    preflightOutDirs(cmd.cwd, targets, inputs);
    for (const { target, env, snapshot } of prepared) {
        await buildOne(config, target, cmd.cwd, env, snapshot);
    }
}

async function buildOne(config: NucktyConfig, target: Target, cwd: string, env: NucktyEnv, snapshot: BuildConfigSnapshot): Promise<void> {
    // Each build owns its template collection. The loader invokes block
    // declarations inside a scoped context read by the public `block()` API.
    const templates = new Templates();

    // Load blocks by BEM deps (bemdecl-driven) — replaces the explicit block
    // list in `ext[]`. Bundles come from config/site.json. `blockDeps` (the
    // per-bundle block-name lists) feeds the CSS/JS stages so they bundle by
    // deps without re-reading the bemdecl files.
    const bundles = snapshot.site.bundles;
    const blockDeps = bundles.length > 0
        ? await loadBlocks(templates, cwd, env.levels.list(), bundles)
        : {};

    const buildDir = path.join(cwd, '.build');
    const outDir = path.join(cwd, target.outDir);
    const ctx: BuildContext = {
        cwd,
        configDir: path.join(cwd, target.configDir),
        buildDir,
        outDir,
        target: target.name,
        env,
        templates,
        store: { allTargets: allTargets(config), currentTarget: target, blockDeps, configSnapshot: snapshot },
        cache: new Map(),
    };
    if (target.lang) {
        ctx.lang = target.lang;
    }

    const pipeline = new Pipeline();
    registerDefaultStages(pipeline);
    // Flush extension-registered pipeline hooks/stages (env.pipeline facade)
    // onto the live pipeline.
    env.pipeline.flush(pipeline);
    await pipeline.run(ctx);
    // Finalize (compression/htaccess/manifest/nginx) AFTER the full pipeline —
    // extension emit stages have written all their files by now (RUNTIME-009).
    await finalizeArtifact(ctx, pipeline);

    process.stdout.write(`nuckty: built target "${target.name}" → ${target.outDir}\n`);
}

