# Extensions

Extensions add new capabilities to nuckty. A package or local module exports the entry point `register(env)` and uses the engine facades to register those capabilities. Five facades expose the extension points.

## Five entry points

| Type | What it extends | Entry point |
|---|---|---|
| [pipeline](pipeline.md) | Build stages | `env.pipeline` |
| [markdown](markdown.md) | Markdown → [BEMJSON](../bemjson.md) conversion | `env.markdown` |
| [block](block.md) | A set of BEM blocks | `env.levels` |
| [command](command.md) | CLI commands | `env.commands` |
| [document](document.md) | Page data → document BEMTree | `env.document` |

A single package can combine several types in one `register`. For example, a documentation extension adds a table-of-contents block, a `:::callout` markdown construct, and a search index stage all at once.

## register(env)

List npm packages or local extension modules in the global `config/config-nuckty.ts`. The engine loads them in order and calls a named `register`, or the default function when no named entry exists.

Third-party extensions may use any npm package name, including a different scope such as `@author/extension`. Use that complete name in `ext`; membership in the `@nuckty` organization is not required.

```ts
import { defineNucktyConfig } from '@nuckty/core';

export default defineNucktyConfig({
    targets: { main: { configDir: 'config/', outDir: 'site/' } },
    ext: ['@nuckty/ext-block-root', './ext/search.ts'],
});
```

Extensions execute with the build process’s permissions; these facades do not sandbox extension code. Local directory modules resolve their `package.json` root `exports` using active Node ESM conditions in declaration order, including nested conditions. An explicit matching `null` blocks loading; export targets must stay inside the package directory. If `exports` is absent, the loader uses `main`. Direct local files remain supported.

## How to choose a type

- You need a new **build stage** (search index, RSS feed, artifact processing) → `pipeline`.
- You need a **markdown construct** (`:::gallery`, `:::callout`, video) → `markdown`.
- You need a **set of blocks** (UI components, documentation blocks) → `block`.
- You need a **CLI command** (`nuckty deploy-ftp`, `nuckty serve`, `nuckty validate`) → `command`.
- You need a **document handler** → [document](document.md).

Ready-made extensions are collected in the [catalog](../../ext/index.md).

Each build needs one document handler. The standard `@nuckty/ext-block-root` registers it and a block level; a custom handler may omit root entirely. It receives `DocumentData` (page, content, [sitemap](../sitemap.md), assets, alternates, target, lang).
