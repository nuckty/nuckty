/**
 * Target configuration — `defineNucktyConfig` + cross-target i18n alternates.
 *
 * A consumer declares build targets in `config/config-nuckty.ts`. Each target
 * names a config dir, an output dir, an optional language code, and an optional
 * host (for cross-target hreflang resolution). `nuckty build` (no arg) builds
 * all targets; `nuckty build <name>` builds one.
 *
 * Cross-target hreflang (openspec requirement "Cross-target i18n alternates for
 * SEO"): when targets form a language family (same group, different lang),
 * resolveAlternates() constructs the same route on sibling hosts
 * and returns `Map<lang, { url, title, host }>` so the consumer's head block
 * can emit `<link rel=alternate hreflang=...>`.
 *
 * @module targets/config
 */

/** One build target. */
export interface Target {
    /** Target name (the key in `targets`). */
    name: string;
    /** Config dir, relative to consumer root (e.g. `config/` or `config-user/`). */
    configDir: string;
    /** Output dir, relative to consumer root (e.g. `site/` or `dist/main-ru/`). */
    outDir: string;
    /** Language tag for this target (e.g. `ru`, `en`, `en-US`). */
    lang?: string;
    /** Public host for this target (e.g. `ru.example.com`). Used for hreflang URLs. */
    host?: string;
    /** Group key — targets sharing a group are language siblings for hreflang. */
    group?: string;
    /** Consumer-owned data passed unchanged to the document handler. */
    data?: Record<string, unknown>;
}

/** Full consumer config: targets + global extensions. */
export interface NucktyConfig {
    targets: Record<string, Omit<Target, 'name'>>;
    /** Global extensions applied to every target. */
    ext?: string[];
}

/**
 * Declare a typed consumer config. Rejects empty targets and returns the
 * supplied object unchanged; build setup performs output-path validation.
 *
 *   export default defineNucktyConfig({
 *     targets: {
 *       'main-ru': { configDir: 'config-user/', outDir: 'dist/main-ru/', lang: 'ru', host: 'ru.example.com', group: 'user' },
 *       'main-en': { configDir: 'config-user/', outDir: 'dist/main-en/', lang: 'en', host: 'en.example.com', group: 'user' },
 *     },
 *     ext: ['./blocks-common', './blocks-user'],
 *   });
 */
export function defineNucktyConfig(config: NucktyConfig): NucktyConfig {
    if (!config.targets || Object.keys(config.targets).length === 0) {
        throw new Error('nuckty: defineNucktyConfig requires at least one target');
    }
    return config;
}

/** Resolve a target by name from the config (throws if missing). */
export function resolveTarget(config: NucktyConfig, name: string | undefined): Target {
    if (name === undefined) {
        // Default: the first declared target (single-target consumers).
        const first = Object.keys(config.targets)[0];
        if (first === undefined) {
            throw new Error('nuckty: requires at least one target');
        }
        return withName(first, config.targets[first]!);
    }
    const t = config.targets[name];
    if (!Object.hasOwn(config.targets, name) || !t) {
        throw new Error(`nuckty: unknown target "${name}". Known: ${Object.keys(config.targets).join(', ')}`);
    }
    return withName(name, t);
}

/** All targets (with names injected). */
export function allTargets(config: NucktyConfig): Target[] {
    return Object.entries(config.targets).map(([name, t]) => withName(name, t));
}

/** One alternate-language variant of a page: keyed by `lang` in `Alternates`. */
export interface AlternateEntry {
    url: string;
    title: string;
    host: string;
}

/**
 * Cross-target hreflang alternates: `Map<lang, { url, title, host }>`. The key
 * is the sibling target's language; the value carries the page's canonical URL,
 * title, and host in that sibling. The consumer's head block reads this to emit
 * `<link rel=alternate hreflang=...>`.
 */
export type Alternates = Map<string, AlternateEntry>;

/**
 * Construct HTTPS URLs for this route on sibling hosts in the same group with
 * a different language. Page existence is not checked. Returns a map keyed by
 * language; titles come from titleByTarget and otherwise remain empty.
 *
 * The engine does NOT emit hreflang itself — it only provides this data. The
 * consumer's head block consumes it.
 *
 * @param current the target being built
 * @param all every target in the config
 * @param route the page route (e.g. `/features`)
 * @param titleByTarget optional map `{targetName → title}` for the page in each sibling
 */
export function resolveAlternates(
    current: Target,
    all: Target[],
    route: string,
    titleByTarget?: Record<string, string>,
): Alternates {
    const out: Alternates = new Map();
    if (!current.group) {
        return out;
    }
    const currentLanguage = current.lang?.toLowerCase();
    const siblings = all.filter(
        (t) => t.group === current.group && t.name !== current.name && t.lang && t.lang.toLowerCase() !== currentLanguage && t.host,
    );

    for (const s of siblings) {
        const title = titleByTarget && Object.hasOwn(titleByTarget, s.name) ? titleByTarget[s.name] ?? '' : '';
        out.set(s.lang!, {
            url: `https://${s.host}${route}`,
            title,
            host: s.host!,
        });
    }
    return out;
}

function withName(name: string, t: Omit<Target, 'name'>): Target {
    return { ...t, name };
}

