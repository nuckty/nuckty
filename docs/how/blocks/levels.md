# Block levels

Levels are the directories where the engine looks for block files (`.nu.ts`, CSS, JS). The order of the levels sets the overriding priority: if a block exists on several levels, its `.nu.ts` template is taken from the later one. CSS and JavaScript are collected from all levels.

## levels.json

Levels are defined in `config/levels.json`:

```json
["content", "blocks"]
```

Entries in `levels.json` are directories relative to the project root. The first also selects the content root (see [external repositories](../external.md)). The engine adds extension levels first, then the levels from this file. A typical block search order:

| Level | What it contains |
|---|---|
| (from extensions) | Block directories added by [block extensions](../ext/block.md) through `env.levels.add(...)`, in registration order. |
| `content` | Content-specific blocks; the first level in `levels.json` also selects the Markdown root. |
| `blocks` | The site’s own blocks, on a later level. |

## Overriding through levels

If the `button` block exists both in an extension and in the site's `blocks/`, the engine picks the one on the later level. This is how a site overrides extension blocks without forking the extension's repository:

```
level 0: nuckty-ext-block-root/blocks/root/root.nu.ts   (base root)
level 1: blocks/root/root.nu.ts                          (site override)
```

At build time, the engine picks `blocks/root/root.nu.ts` from the later level — the site's version. The order of the levels is the priority.

## Extension levels

A [block extension](../ext/block.md) ships its blocks in a `blocks/` directory. The engine adds that directory as a level via `env.levels.add(dir)`:

```ts
import { fileURLToPath } from 'node:url';
import type { NucktyEnv } from 'nuckty';

export function register(env: NucktyEnv): void {
    env.levels.add(fileURLToPath(new URL('../blocks/', import.meta.url)));
}
```

The engine loads extension blocks through dependencies, just like site blocks. For details, see the [block extension](../ext/block.md).

## Block file lookup

When [dependencies](deps.md) require `menu`, the engine searches for `<level>/menu/menu.nu.ts` and loads only the last matching file. Declarations from an earlier file are not retained automatically: `next()` only uses declarations registered in the current collection. To extend a base template, explicitly invoke its registration function in your file; see [block structure](authoring.md).

CSS and JavaScript are collected for each declared block from all levels. CSS follows the normal cascade: later rules can override earlier rules, and conflicts remain possible. JavaScript files from all levels are included in the bundle.

The file name matches the block name, and so does the directory name — that is why the engine can find a block by name:

```
blocks/
  menu/
    menu.nu.ts
    menu.css
    menu.bemdecl.js
  button/
    button.nu.ts
    button.css
```

## Why levels are needed

Levels provide the foundation of overriding in BEM: a base block arrives from an early level, and the site adds its own version on a later one. Without levels, an extension could not ship blocks, and a site could not override them. This keeps extensibility and overriding separate: the extension provides the base, and the site replaces it with its own version when needed.

