# nuckty-ext-block-grid

A multi-column content layout. The package combines the `grid` block and the `:::grid` markdown construct: the syntax and the implementation ship together.

## Types

The package combines two extension types through a single `register(env)`:

- [block](../../how/ext/block.md) — the `grid` block via `env.levels`.
- [markdown](../../how/ext/markdown.md) — the `:::grid` construct via `env.markdown`.

## Markdown construct

The author writes:

```md
:::grid
First column.

Second column.

Third column.
:::
```

Each nonempty child paragraph becomes a plain-text `grid__item`. Emphasis and links become text; child lists and headings cause an error. An empty container falls back to content. Without the extension, the engine processes the directive's Markdown normally.

## Behavior

- **Responsive grid** — cells are laid out in multiple columns via the block's CSS; the number of columns adapts to the screen width.
- **No external dependencies** — the layout rests on the block's CSS, with no third-party CSS or JS libraries.

## Installation

This example extends the quickstart with the standard `nuckty-ext-block-root` document handler. Add the new extension to `ext` in the global `config/config-nuckty.ts`, retaining the other entries. If you use a custom document handler, keep its registration instead of `nuckty-ext-block-root`.

Run the command below from the extracted [starter project](../../how/start.md); prepared extension archives are in `packages/`.

```
npm install ./packages/nuckty-ext-block-grid-1.0.0-beta1.tgz
```

```ts
import { defineNucktyConfig } from 'nuckty';

export default defineNucktyConfig({
    targets: { main: { configDir: 'config/', outDir: 'site/' } },
    ext: ['nuckty-ext-block-root', 'nuckty-ext-block-grid'],
});
```

After that, the `:::grid` construct works in any `.md`; add the `grid` block to the bundle's bemdecl — it connects through [dependencies](../../how/blocks/deps.md).

## Overriding

The `grid` block is overridden like any other: place your own `blocks/grid/grid.nu.ts` on a later [level](../../how/blocks/levels.md).

