# Pipeline extension

A pipeline extension adds new build stages or wraps existing ones with hooks. The entry point is `env.pipeline`. Through it, the extension modifies the [build pipeline](../pipeline.md): builds a search index, generates a [hosting](../../out/hosting.md) configuration, processes the finished artifact.

## API

```ts
interface NucktyEnv {
    pipeline: {
        before(stage: string, fn: Stage): void;          // run before the stage
        after(stage: string, fn: Stage): void;           // run after the stage
        registerStage(name: string, fn: Stage, opts: { phase: Phase }): void;
    };
}
```

`Stage` is a function `(ctx: BuildContext) => void | Promise<void>` that operates on the data in the [build context](../pipeline.md) fields.

A stage can import `getBuildConfig` from `nuckty` and call `getBuildConfig(ctx)` to reuse the captured configuration of its target. The snapshot exposes merged `site` settings, ordered `levels`, `contentDir`, `contentRelative`, and `externalUrls`; configuration ownership is described in [targets](../targets.md).

Before reading or writing an artifact destination, call `await assertArtifactPath(ctx.outDir, destination)` imported from `nuckty`. It rejects existing symbolic links within the declared root and paths that escape it.

## Example: a search index stage

The stage writes a simple index of URLs, page titles, and headings:

```ts
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { DocumentData, NucktyEnv } from 'nuckty';
import { assertArtifactPath } from 'nuckty';

export function register(env: NucktyEnv): void {
    env.pipeline.registerStage('search', async (ctx) => {
        const sitemap = ctx.store['sitemap'] as DocumentData['sitemap'] | undefined;
        if (!sitemap) {
            throw new Error('The sitemap stage must run first');
        }
        const index = Object.values(sitemap.pages).map((page) => ({
            url: page.url,
            title: page.title,
            headings: page.headings?.map((heading) => heading.text) ?? [],
        }));
        const destination = join(ctx.outDir, 'search.json');

        await assertArtifactPath(ctx.outDir, destination);
        await writeFile(destination, JSON.stringify(index));
    }, { phase: 'emit' });
}
```
Save the module as `ext/search.ts` and add `'./ext/search.ts'` to `ext` in the global configuration. After building, `search.json` appears in the artifact and manifest, but the default [compression](../../out/compression.md) stage does not create Brotli/Gzip copies of `.json`. Use `env.pipeline.after` or `before` with an existing stage name for hooks.

## Typical uses

- **Search index** (Orama, SQLite FTS5, lunr) — a stage after [HTML](../../out/html.md); reads page content, writes the index into the artifact.
- **Hosting configuration** — a stage in `emit`; generates a Caddy configuration or a custom nginx configuration.
- **Image preparation** — a `before('images', ...)` hook creates variants before the family hash is computed and files are copied. For a separate step before the build, use the [conversion command](../../ext/command/convert-images.md).

## When to choose pipeline

Modifying the artifact or the course of the build is `pipeline`. Adding a markdown construct is a [markdown extension](markdown.md). Adding a UI block is a [block extension](block.md).

## Pipeline extension catalog

Ready-made pipeline extensions are collected in the [catalog](../../ext/pipeline.md).
