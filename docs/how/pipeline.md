# Build pipeline

Building a site is a programmable pipeline. Phases run in a fixed order, and inside them the engine runs named stages. Stages can be added and wrapped with hooks; duplicate names are rejected. The core invokes this pipeline through `nuckty build`.

## Phases

The pipeline consists of phases — major steps that follow one another:

```
clean → prepare → render → resolve → emit
```

| Phase | What happens |
|---|---|
| `clean` | Clears the output directory |
| `prepare` | Prepares resources: [images](../out/images.md), assets |
| `render` | [Sitemap](sitemap.md), Markdown → [BEMJSON](bemjson.md); builds the CSS and JS bundles |
| `resolve` | Reserved for resolving cross-references and anchors (a placeholder for now) |
| `emit` | [HTML](../out/html.md) and extension outputs; finalization follows this phase |

The order of the phases is fixed — it is the skeleton of the build. The set of stages inside a phase is what the author changes: adds stages and wraps them with hooks.

## Stages

Inside the phases, the work is done by stages — named functions `(ctx) => void | Promise<void>`. Each stage takes data from the build context (`ctx.{cwd, buildDir, outDir, store}`) and writes its result into its fields. The core stages, in execution order:

- `clean` (clean) — clears the output directory.
- `images` (prepare) — copies original images and prepared variants, writes `.build/image-mapping.json`.
- `assets` (prepare) — copies static files (PDF, ZIP, MP4, `robots.txt`) from the configuration and external repositories.
- `sitemap` (render) — parses `sitemap.yml`, converts Markdown into BEMJSON, builds the URL map.
- `css` / `js` (render) — build bundles from dependencies, add a content-hash.
- `resolve` (resolve) — a placeholder, reserved.
- `html` (emit) — applies [templates](templates.md) and turns BEMJSON into HTML.

After the `emit` phase (core AND extension emit stages included) the build runs the finalization pass, in this order:

- `compression` — compresses selected nonempty artifact files (Brotli Q11, Gzip 9).
- `htaccess` — generates `.htaccess` in `outDir`.
- `manifest` — writes `manifest.json` with hashes and sizes.
- `nginx` — generates `nginx.conf` in `buildDir`.

Extension emit stages finish before finalization, so their files reach [compression](../out/compression.md) and the manifest. Named before/after hooks also apply to finalizers; unknown hook names fail before cleanup. Emit new files before compression rather than adding them from a later finalizer hook.

## before/after hooks

You can put a hook around any stage:

```ts
env.pipeline.after('html', myStage);
env.pipeline.before('sitemap', addExtraFormat);
env.pipeline.registerStage('search', searchStage, { phase: 'emit' });
```

This is the main extension point of the build. After HTML, a separate stage can build a search index, generate an RSS feed, or post-process the finished artifact. Stage names are unique — registering an already-registered name is an error. For details, see the [pipeline extension](ext/pipeline.md).

## Build context

Stages communicate through `ctx` — the build context:

- `ctx.cwd` — the root of the user's project.
- `ctx.configDir` — the directory holding `sitemap.yml` and configuration files.
- `ctx.buildDir` — the shared `.build/` workspace; after a multi-target build it contains the last target's intermediate results. `nuckty serve` writes its own `nginx-serve.conf`.
- `ctx.outDir` — the final artifact (`site/`) that gets deployed to the server.
- `ctx.store` — storage shared between stages: the sitemap, images, bundle hashes.

Stages do not call each other directly. They read from and write to the shared storage, and the pipeline guarantees the execution order. Each stage must respect the shared data contract and the results it needs from earlier stages.

## Code, not declarative config

The pipeline is code, not YAML. A stage and a hook are typed functions. Hence the benefits:

- the compiler checks that a stage matches its contract;
- the editor suggests the `ctx` fields;
- build extensions are written in plain TypeScript, not a separate configuration language: there is nothing to relearn, and no config-language limits on what an extension can do.

When `config-nuckty.ts` runs out of options and you need something nontrivial (a custom stage, a special order, a conditional build), you write it as extension code instead of complicating `config-nuckty.ts`. For details, see the [extensions](ext/index.md) section.

