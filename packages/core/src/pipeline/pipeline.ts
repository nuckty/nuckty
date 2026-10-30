/**
 * Programmatic build pipeline.
 *
 * A `Pipeline` holds named stages grouped into ordered phases, plus before/after
 * hooks. The consumer (or the engine's default config) registers stages; the
 * build runs them phase by phase. Nothing about the pipeline is hard-wired in
 * npm scripts — nuckty build invokes pipeline.run(ctx) for each target.
 *
 * Phases run in order: clean → prepare → render → resolve → emit. Within a
 * phase, stages run in declaration order. Hooks (`before`/`after`) run around a
 * named stage and receive the same context.
 *
 * @module pipeline/pipeline
 */

import type { NucktyEnv } from '../env/env.js';
import type { Templates } from '../bem/templates.js';
import type { BuildStore } from '../stages/types.js';

/** Ordered build phases. */
export type Phase = 'clean' | 'prepare' | 'render' | 'resolve' | 'emit';

const PHASE_ORDER: readonly Phase[] = ['clean', 'prepare', 'render', 'resolve', 'emit'];

/** A stage receives the build context and may mutate it / write files. */
export type Stage<C extends BuildContext = BuildContext> = (ctx: C) => void | Promise<void>;

export interface BuildContext {
    /** Consumer root (process.cwd() at CLI invocation). */
    cwd: string;
    /** Config directory for this target (e.g. `config/` or `config-user/`). */
    configDir: string;
    /** Intermediate build workspace (e.g. `<cwd>/.build`). */
    buildDir: string;
    /** Final output root for this build (e.g. `<cwd>/site` or `<cwd>/dist/<target>`). */
    outDir: string;
    /** Target name (from config/config-nuckty.ts). */
    target: string;
    /** Target language code, if the target declares one. */
    lang?: string;
    /** Extension facades for stages, Markdown, levels, commands and documents. */
    env: NucktyEnv;
    /** Templates loaded for this build and used by the HTML stage. */
    templates: Templates;
    /** Per-build artifacts that stages hand to later stages. */
    store: BuildStore;
    /** Scratch cache shared by stages of this target build; recreated per build. */
    cache: Map<string, unknown>;
}

interface StageEntry<C extends BuildContext> {
    name: string;
    phase: Phase;
    fn: Stage<C>;
    order: number;
}

export class Pipeline<C extends BuildContext = BuildContext> {
    private stages: StageEntry<C>[] = [];
    private finalizers: Array<{ name: string; fn: Stage<C> }> = [];
    private beforeHooks: Map<string, Stage<C>[]> = new Map();
    private afterHooks: Map<string, Stage<C>[]> = new Map();
    private counter = 0;

    /** Register a named stage into a phase. */
    registerStage(name: string, fn: Stage<C>, opts: { phase: Phase }): void {
        // A duplicate name would run both stages and their hooks; reject it.
        if (this.stages.some((s) => s.name === name) || this.finalizers.some((s) => s.name === name)) {
            throw new Error(
                `nuckty: pipeline stage "${name}" is already registered — stage names must be unique`,
            );
        }
        this.stages.push({ name, phase: opts.phase, fn, order: this.counter++ });
    }

    /** Artifact finalizers retain named hooks and run when finalize(ctx) is called. */
    registerFinalizer(name: string, fn: Stage<C>): void {
        if (this.stages.some((entry) => entry.name === name) || this.finalizers.some((entry) => entry.name === name)) {
            throw new Error(`nuckty: pipeline stage "${name}" is already registered — stage names must be unique`);
        }
        this.finalizers.push({ name, fn });
    }

    /** Refuse misspelled or removed hooks before any stage can clean outputs. */
    private validateHooks(): void {
        const names = new Set([...this.stages, ...this.finalizers].map((entry) => entry.name));
        for (const name of [...this.beforeHooks.keys(), ...this.afterHooks.keys()]) {
            if (!names.has(name)) {
                throw new Error(`nuckty: hook references unknown pipeline stage "${name}"`);
            }
        }
    }

    async finalize(ctx: C): Promise<void> {
        this.validateHooks();
        for (const entry of this.finalizers) {
            await this.runStage(entry, ctx);
        }
    }

    /** Register a hook that runs before the named stage. */
    before(stageName: string, fn: Stage<C>): void {
        const list = this.beforeHooks.get(stageName) ?? [];
        list.push(fn);
        this.beforeHooks.set(stageName, list);
    }

    /** Register a hook that runs after the named stage. */
    after(stageName: string, fn: Stage<C>): void {
        const list = this.afterHooks.get(stageName) ?? [];
        list.push(fn);
        this.afterHooks.set(stageName, list);
    }

    /** Run the full pipeline for the given context. */
    async run(ctx: C): Promise<void> {
        this.validateHooks();
        for (const phase of PHASE_ORDER) {
            const inPhase = this.stages
                .filter((s) => s.phase === phase)
                .sort((a, b) => a.order - b.order);
            for (const entry of inPhase) {
                await this.runStage(entry, ctx);
            }
        }
    }

    /** Names of all registered stages, in run order. Useful for tests/debugging. */
    stageNames(): string[] {
        return PHASE_ORDER.flatMap((phase) =>
            this.stages
                .filter((s) => s.phase === phase)
                .sort((a, b) => a.order - b.order)
                .map((s) => s.name),
        );
    }

    private async runStage(entry: { name: string; fn: Stage<C> }, ctx: C): Promise<void> {
        const before = this.beforeHooks.get(entry.name) ?? [];
        const after = this.afterHooks.get(entry.name) ?? [];
        for (const hook of before) {
            await hook(ctx);
        }
        await entry.fn(ctx);
        for (const hook of after) {
            await hook(ctx);
        }
    }
}
