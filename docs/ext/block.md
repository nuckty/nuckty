# Block extensions

This section lists the block extensions that add sets of BEM blocks via `env.levels`. The blocks you need get into the build by [dependencies](../how/blocks/deps.md).

## How it works

A block extension adds a level:

```ts
import { fileURLToPath } from 'node:url';
import type { NucktyEnv } from 'nuckty';

export function register(env: NucktyEnv): void {
    env.levels.add(fileURLToPath(new URL('../blocks/', import.meta.url)));
}
```

The full contract is in the [block extension guide](../how/ext/block.md).

## Registry

- [`nuckty-ext-block-root`](block/root.md) — supplies the standard document handler and the `root` [HTML](../out/html.md) wrapper.
- [`nuckty-ext-block-gallery`](block/gallery.md) — a gallery with a lightbox.
- [`nuckty-ext-block-grid`](block/grid.md) — a multi-column page layout (`:::grid`).

Video (`@[provider](id)`) is also a markdown construct, but without a paired block; the [`nuckty-ext-markdown-video`](markdown/video.md) package is described separately.

