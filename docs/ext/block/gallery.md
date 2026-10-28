# @nuckty/ext-block-gallery

An image gallery with a lightbox. The package combines the `gallery` block and the `:::gallery` markdown construct: the syntax and the implementation ship together.

## Types

The package combines two extension types through a single `register(env)`:

- [block](../../how/ext/block.md) — the `gallery` block (and the helper `lightbox` block) via `env.levels`.
- [markdown](../../how/ext/markdown.md) — the `:::gallery` construct via `env.markdown`.

## Markdown construct

The author writes:

```md
:::gallery
![Caption A](a.png)
![Caption B](b.png)
![Caption C](c.png)
:::
```

The markdown extension finds the container node and turns it into the [BEMJSON](../../how/bemjson.md) of a `gallery` block with a list of images. For each image, the engine substitutes the hashed name from `image-mapping.json` (see [images](../../out/images.md)).

## Behavior

- **Grid** — the block's CSS lays the images out in a responsive grid.
- **Lightbox** — clicking an image opens the full-size version (the `lightbox` block). The implementation is its own, with no external JS dependencies like tobii: the engine does not pull in frontend libraries.
- **Lazy loading** — the first image in each gallery has no `loading=lazy`; the others do. This does not determine whether it is visible without scrolling.

## Installation

This example extends the quickstart with the standard `@nuckty/ext-block-root` document handler. Add the new extension to `ext` in the global `config/config-nuckty.ts`, retaining the other entries. If you use a custom document handler, keep its registration instead of `@nuckty/ext-block-root`.

Install the extension from npm in the extracted [starter project](../../how/start.md):

```
npm install --save-exact @nuckty/ext-block-gallery@1.0.0-rc.0
```

```ts
import { defineNucktyConfig } from '@nuckty/core';

export default defineNucktyConfig({
    targets: { main: { configDir: 'config/', outDir: 'site/' } },
    ext: ['@nuckty/ext-block-root', '@nuckty/ext-block-gallery'],
});
```

After that, the `:::gallery` construct works in any `.md`; add the `gallery` and `lightbox` blocks to the bundle's bemdecl — the styles and the script reach the build through [dependencies](../../how/blocks/deps.md).

## Overriding

Place `blocks/gallery/gallery.nu.ts` on a later [level](../../how/blocks/levels.md) to replace the template. For styles, add `blocks/gallery/gallery.css` there: CSS for a declared block is collected from all levels. A [bemdecl](../../how/blocks/deps.md) lists block names.
