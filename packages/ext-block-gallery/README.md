# nuckty-ext-block-gallery

> **Image gallery with lightbox — the `:::gallery` construct and the `gallery` block.**

A [nuckty](https://github.com/nuckty/nuckty) package combining two extension types in one `register(env)`:

- **block** — the `gallery` block and the `lightbox` helper via `env.levels`;
- **markdown** — the `:::gallery` construct via `env.markdown.directive`.

## The markdown construct

```md
:::gallery
![Caption A](a.png)
![Caption B](b.png)
![Caption C](c.png)
:::
```

The directive handler collects the container's images, rewrites their URLs through `image-mapping.json` (the engine's shared resolver), and builds the `gallery` block tree. A container without images falls back to its plain content.

## Behavior

- **Grid** — the block's CSS lays images out in a responsive grid; the column count follows the viewport width.
- **Lightbox** — clicking an image opens the full-size version in the `lightbox` block. The implementation is our own, in vanilla JS: the engine pulls no frontend libraries. Close with Esc, a backdrop click, or the button.
- **Lazy loading** — the first image in each gallery has no `loading=lazy` attribute; the others do. The handler does not determine whether a gallery is above the fold.

## How to load

```bash
npm install nuckty-ext-block-gallery
```

This example extends the quickstart with the standard `nuckty-ext-block-root` document handler. Add the new extension to `ext` in the global `config/config-nuckty.ts`, retaining the other entries. If you use a custom document handler, keep its registration instead of `nuckty-ext-block-root`.

```ts
import { defineNucktyConfig } from 'nuckty';

export default defineNucktyConfig({
    targets: { main: { configDir: 'config/', outDir: 'site/' } },
    ext: ['nuckty-ext-block-root', 'nuckty-ext-block-gallery'],
});
```

And add `gallery` and `lightbox` to the page bundle's bemdecl, e.g. `blocks/page/page.bemdecl.js` — that pulls the templates, styles, and the script into the build.

## Overriding

Place `blocks/gallery/gallery.nu.ts` on a later level to replace the template. To adjust styling, add `blocks/gallery/gallery.css` on that level: CSS for a declared block is collected from all levels. A bemdecl lists block names, not CSS files.

## Spec

Behavior is fixed by the openspec `ext-block-gallery` spec (`openspec/specs/ext-block-gallery/spec.md`).

## License

MIT.

