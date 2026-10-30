# Block dependencies

The engine loads blocks listed in bundle dependency declarations (`deps`): it finds their `.nu.ts` files and invokes them without a manual `registerBlock`. The bundle's block list is explicit; page content does not update it automatically.

## bemdecl — the entry point

The entry point of the dependencies is the file `blocks/<bundle>/<bundle>.bemdecl.js` (the BEM standard). It lists which blocks the bundle needs:

```js
// blocks/docs-layout/docs-layout.bemdecl.js — CommonJS
module.exports = {
    mustDeps: [
        'root',          // Standard document wrapper
        'docs-layout',   // the frame itself
    ],
    shouldDeps: [
        'menu',          // navigation
        'article',       // content
    ],
};
```

The file is read as CommonJS. An entry is a string — a block `'menu'` or an element `'menu__item'` — or an object: `{ block: 'menu' }` names the block, `{ block: 'menu', elem: 'item' }` only that element (`elem` may be an array), and `{ block: 'menu', elems: ['item', 'link'] }` the block and those elements; other fields are an error. Elements contribute their `menu/__item/menu__item.css` and `.js` files; a flat array (`module.exports = ['root', 'docs-layout', 'menu']`) and an object with `mustDeps`/`shouldDeps` are both valid — the two lists are merged into one.

## The list is flat, with no transitivity

The declaration does not traverse nested dependencies: if the `menu` block needs `button`, `button` is also written into the bundle's bemdecl. The list is read in full:

```
docs-layout.bemdecl.js → root, docs-layout, menu, article, button, icon
```

Each block is loaded from its own `.nu.ts`. A flat list is easier to verify: what is written is what gets into the build.

## Where bundles come from

Bundles are listed in `config/site.json` → `bundles` (an empty list by default; configure each required bundle explicitly). For each one, the engine reads its bemdecl and builds a CSS and a JS bundle — for details, see [assets in the output](../../out/assets.md).

## CSS and JS via dependencies

The same list defines the style and script bundles. If a block is in the dependencies, its `block.css` and `block.js` are included in the page bundle.

## One declaration for templates and assets

The declaration is an explicit bundle block list. It selects [templates](../templates.md), CSS, and JavaScript together; adding a block to content does not update it automatically. The loader does not traverse `.deps.js` files. See [block levels](levels.md) for file lookup.

In a project with `"type":"module"`, add `blocks/package.json` containing `{"type":"commonjs"}` so `.bemdecl.js` remains CommonJS. A later-level declaration replaces the earlier declaration in full.
