# Block extension

A block extension ships a set of BEM blocks — one or more `.nu.ts` files plus, optionally, CSS and JS. The entry point is `env.levels`: the extension adds its own `blocks/` directory as a [level](../blocks/levels.md), and the engine loads blocks from it by [dependencies](../blocks/deps.md).

## How it works

The engine does not know in advance which blocks exist. Levels point to the directories where the engine looks for blocks. A block extension adds its own level:

```
config/levels.json:        ["content", "blocks"]              site levels
env.levels.add(...)        @nuckty/ext-block-gallery/blocks/    extension level
```

When the `gallery` block is listed in a bundle's dependencies, the engine looks for `gallery.nu.ts` across all levels (including the extension's level) and picks the file from the latest matching level. For details, see [levels](../blocks/levels.md) and [dependencies](../blocks/deps.md).

## API

```ts
interface NucktyEnv {
    levels: {
        add(dir: string): void;
    };
}
```

```ts
// inside the extension's register(env)
import { fileURLToPath } from 'node:url';
import type { NucktyEnv } from '@nuckty/core';

export function register(env: NucktyEnv): void {
    env.levels.add(fileURLToPath(new URL('../blocks/', import.meta.url)));
}
```

The extension does not register each block by name: it puts `.nu.ts` files into `blocks/` and adds the directory as a level. The rest — loading by dependencies — the engine handles itself.

## Extension structure

```
@nuckty/ext-block-gallery/
  blocks/
    gallery/
      gallery.nu.ts          block template
      gallery.css            styles
      gallery.js             scripts (lightbox)
  src/index.ts               register(env)
  package.json
  AGENTS.md                  wires up nuckty-codestyle
```

The extension's `blocks/` directory mirrors the structure of the site's blocks. The `gallery` block lives in `blocks/gallery/gallery.nu.ts`, just like any other block.

## Overriding and composition

The engine loads extension levels first and appends the site's configured levels afterward, so a block can be overridden: put your own version of `blocks/gallery/gallery.nu.ts` on a later level, and the engine will pick it. For details, see [levels](../blocks/levels.md).

## One package — several blocks

An extension can ship several related blocks. For example, a component kit adds `button`, `input`, `card`, `modal`: a single `register(env)` registers the shared directory as a level. The bundle's dependency declaration determines which blocks are loaded.

## Relation to markdown extensions

A markdown construct (`:::gallery`) expands into a block (`gallery`). That is why a markdown extension providing the syntax and a block extension providing the block are often combined in one package — syntax and implementation side by side. For details, see the [markdown extension](markdown.md) guide.

## Block extension catalog

Ready-made block extensions are collected in the [catalog](../../ext/block.md). Examples: [`root`](../../ext/block/root.md) (the [HTML](../../out/html.md) page wrapper), [`gallery`](../../ext/block/gallery.md) (a gallery with a lightbox).
