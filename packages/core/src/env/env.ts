/**
 * NucktyEnv — the build environment populated by extensions via register(env).
 *
 * The extension entry points (openspec `extensions` spec) live on the env:
 * `commands`, `document`, `markdown`, `levels`, `pipeline`. Block modules export
 * `templates()`, and the deps loader invokes them in a scoped template context.
 *
 * @module env/env
 */

import type { NucktyConfig } from '../targets/config.js';
import type { BEMTree } from '../bem/types.js';
import type { MarkdownOptions } from '../markdown/remark.js';
import { DocumentFacade } from '../document/document.js';

/**
 * Arguments a command handler receives (openspec `extensions` spec: the core
 * parses argv into `positional` + `flags` and passes the loaded config + cwd).
 */
export interface CommandArgs {
    positional: string[];
    flags: Record<string, string | boolean>;
    config: NucktyConfig;
    cwd: string;
}

/** A CLI command handler returns an exit code (0 success, non-zero error). */
export type CommandHandler = (args: CommandArgs) => Promise<number>;

/** Optional CLI parsing metadata for a registered command. */
export interface CommandOptions {
    /** Flags that take no value and must leave the next token positional. */
    booleanFlags?: readonly string[];
}

/** A registered CLI command (name, description, handler). */
export interface CommandEntry {
    name: string;
    description: string;
    handler: CommandHandler;
    booleanFlags: readonly string[];
}

/** `env.commands` registry — CLI command extension point (openspec `extensions`). */
export class Commands {
    private readonly map = new Map<string, CommandEntry>();

    add(name: string, description: string, handler: CommandHandler, options: CommandOptions = {}): void {
        this.map.set(name, { name, description, handler, booleanFlags: options.booleanFlags ?? [] });
    }

    has(name: string): boolean {
        return this.map.has(name);
    }

    get(name: string): CommandEntry | undefined {
        return this.map.get(name);
    }

    /** All registered command entries (for `--help` listing). */
    list(): CommandEntry[] {
        return [...this.map.values()];
    }
}

/**
 * `env.levels` registry — the level-extension entry point (openspec `extensions`
 * spec). Extensions add block-search levels via `env.levels.add(dir)`; the
 * block loader and css/js/images stages read them via `env.levels.list()`.
 * Build setup adds extension levels first, then the configured consumer levels.
 */
export class Levels {
    private readonly dirs: string[] = [];

    add(dir: string): void {
        if (!this.dirs.includes(dir)) {
            this.dirs.push(dir);
        }
    }

    list(): string[] {
        return [...this.dirs];
    }
}

/**
 * `env.markdown` facade — the markdown-extension entry point (openspec
 * `extensions` spec). Extensions register remark plugins (mdast transforms)
 * via `env.markdown.use(plugin)` and map generic directives (`:::name`,
 * `::name`, `:name`) to BEMJSON via `env.markdown.directive(name, handler)`. The
 * sitemap stage passes both to the remark processor; the core knows no specific
 * construct (gallery, callout, grid, …) — only the fallback for an unmapped
 * directive (plain content, openspec `markdown` spec).
 */
export type RemarkPlugin = import('unified').Plugin<[], import('mdast').Root>;

/** A directive node handed to a directive handler. */
export interface DirectiveNode {
    /** Directive form: container `:::name`, leaf `::name` or text `:name`. */
    type?: 'containerDirective' | 'leafDirective' | 'textDirective';
    /** Directive name (the `name` in `:::name` / `::name` / `:name`). */
    name: string;
    /** The directive's mdast children; inline or block nodes depend on its type. */
    children?: unknown[];
    /** Parsed attributes (`{#id .class key=val}`). */
    attributes?: Record<string, string>;
}

/** An mdast node handed to a node handler; its fields depend on `type`. */
export interface MarkdownNode {
    type: string;
    [field: string]: unknown;
}

/** Converters a handler uses to render mdast children with the page's link and image resolution. */
export interface DirectiveConverters {
    /** Render inline (phrasing) children: text, emphasis, links, images, inline code. */
    inline(children: unknown[]): BEMTree;
    /** Render block children: paragraphs, lists, headings and other blocks. */
    blocks(children: unknown[]): BEMTree;
}

/**
 * Map a directive to BEMJSON. `env` carries the page's Markdown options
 * (image mapping, source file, language, …); `convert` renders the directive's
 * children, and `inline` rejects block nodes. Returning `null` falls back to
 * the directive's plain content; page state from conversions is then reset.
 */
export type DirectiveHandler = (node: DirectiveNode, env: Readonly<MarkdownOptions>, convert: DirectiveConverters) => BEMTree | null;

/**
 * Map an mdast node of one type to BEMJSON before the core conversion of that
 * type. Returning `null` keeps the core conversion. Remark plugins may insert
 * nodes of their own types for a handler to map.
 */
export type MarkdownNodeHandler = (node: MarkdownNode, env: Readonly<MarkdownOptions>, convert: DirectiveConverters) => BEMTree | null;

export class MarkdownFacade {
    private readonly plugins: RemarkPlugin[] = [];
    private readonly directiveMap = new Map<string, DirectiveHandler>();
    private readonly nodeMap = new Map<string, MarkdownNodeHandler>();

    /** Register a remark plugin (mdast transform) — applied after the core parse. */
    use(plugin: RemarkPlugin): void {
        this.plugins.push(plugin);
    }

    /** All registered remark plugins (for the sitemap stage to pass to createMarkdown). */
    list(): RemarkPlugin[] {
        return [...this.plugins];
    }

    /**
     * Map a generic directive (`:::name` container, `::name` leaf, `:name` text)
     * to a BEMJSON-producing handler. Openspec `markdown` spec: the core knows no
     * specific construct; a directive with no registered mapping falls back to
     * its plain content.
     */
    directive(name: string, handler: DirectiveHandler): void {
        this.directiveMap.set(name, handler);
    }

    /**
     * Snapshot of the directive map (name → handler) for the sitemap stage to
     * pass into the markdown bridge. Handlers are opaque to the core; the bridge
     * invokes them with a directive node and its bridge env.
     */
    directiveMappings(): Map<string, DirectiveHandler> {
        return new Map(this.directiveMap);
    }

    /** Map mdast nodes of `type` to BEMJSON before the core conversion; a later registration replaces an earlier one. */
    node(type: string, handler: MarkdownNodeHandler): void {
        this.nodeMap.set(type, handler);
    }

    /** Snapshot of the node handlers (type → handler) for the Markdown bridge. */
    nodeMappings(): Map<string, MarkdownNodeHandler> {
        return new Map(this.nodeMap);
    }
}

/** A pending pipeline registration recorded by `env.pipeline` before the real Pipeline exists. */
interface PendingStageReg {
    kind: 'stage' | 'before' | 'after';
    name: string;
    fn: import('../pipeline/pipeline.js').Stage;
    phase?: import('../pipeline/pipeline.js').Phase;
}

/**
 * `env.pipeline` facade — the pipeline-extension entry point (openspec
 * `extensions` spec). Extensions call `env.pipeline.before/after/registerStage`
 * at register time (before the real `Pipeline` is constructed in `buildOne`).
 * The calls buffer here; `buildOne` flushes them onto the live `Pipeline`.
 */
export class PipelineFacade {
    private readonly pending: PendingStageReg[] = [];

    registerStage(name: string, fn: import('../pipeline/pipeline.js').Stage, opts: { phase: import('../pipeline/pipeline.js').Phase }): void {
        this.pending.push({ kind: 'stage', name, fn, phase: opts.phase });
    }

    before(stageName: string, fn: import('../pipeline/pipeline.js').Stage): void {
        this.pending.push({ kind: 'before', name: stageName, fn });
    }

    after(stageName: string, fn: import('../pipeline/pipeline.js').Stage): void {
        this.pending.push({ kind: 'after', name: stageName, fn });
    }

    /** Flush buffered registrations onto a real pipeline (called by `buildOne`). */
    flush(pipeline: { registerStage: (n: string, fn: import('../pipeline/pipeline.js').Stage, opts: { phase: import('../pipeline/pipeline.js').Phase }) => void; before: (n: string, fn: import('../pipeline/pipeline.js').Stage) => void; after: (n: string, fn: import('../pipeline/pipeline.js').Stage) => void }): void {
        for (const reg of this.pending) {
            if (reg.kind === 'stage') {
                if (reg.phase !== undefined) {
                    pipeline.registerStage(reg.name, reg.fn, { phase: reg.phase });
                }
            } else if (reg.kind === 'before') {
                pipeline.before(reg.name, reg.fn);
            } else {
                pipeline.after(reg.name, reg.fn);
            }
        }
    }
}

export class NucktyEnv {
    /** Consumer-owned document renderer; the engine only supplies build data. */
    readonly document: DocumentFacade = new DocumentFacade();
    /** `env.pipeline` facade — buffer for before/after/registerStage calls. */
    readonly pipeline: PipelineFacade = new PipelineFacade();
    /** `env.levels` registry — block-search levels (config/levels.json + extensions). */
    readonly levels: Levels = new Levels();
    /** `env.markdown` facade — remark plugins registered by extensions. */
    readonly markdown: MarkdownFacade = new MarkdownFacade();
    /** CLI command registry — `build` is core; every other command is an extension. */
    readonly commands: Commands = new Commands();

}

