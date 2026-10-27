# @nuckty/ext-block-grid

> **Multi-column content layout — the `:::grid` construct and the `grid` block.**

A [nuckty](https://github.com/nuckty/nuckty) package combining two extension types in one `register(env)`:

- **block** — the `grid` block via `env.levels`;
- **markdown** — the `:::grid` construct via `env.markdown.directive`.

## The markdown construct

```md
:::grid
First column.

Second column.

Third column.
:::
```

The handler turns each nonempty child paragraph into a plain-text `grid__item`. Links and emphasis become text; lists, headings, and other non-paragraph children cause an error. An empty container falls back to plain content.

## Behavior

- **Responsive grid** — the block's CSS lays items out in several columns; the column count follows the viewport width.
- **No external dependencies** — the layout is the block's own CSS, with no third-party CSS or JS libraries.

## How to load

```bash
npm install @nuckty/ext-block-grid
```

This example extends the quickstart with the standard `@nuckty/ext-block-root` document handler. Add the new extension to `ext` in the global `config/config-nuckty.ts`, retaining the other entries. If you use a custom document handler, keep its registration instead of `@nuckty/ext-block-root`.

```ts
import { defineNucktyConfig } from '@nuckty/core';

export default defineNucktyConfig({
    targets: { main: { configDir: 'config/', outDir: 'site/' } },
    ext: ['@nuckty/ext-block-root', '@nuckty/ext-block-grid'],
});
```

And add `grid` to the page bundle's bemdecl, e.g. `blocks/page/page.bemdecl.js`.

## Overriding

Add `blocks/grid/grid.nu.ts` on a later level to replace the template. Add `blocks/grid/grid.css` there to adjust styles: CSS is collected from all levels. List `grid` in the bemdecl, not CSS file paths.

## Spec

Behavior is fixed by the openspec `ext-block-grid` spec (`openspec/specs/ext-block-grid/spec.md`).

## License

MIT.
