# Block: structure

A block is described by a `.nu.ts` file. Inside is template registration through the nu syntax (`block()(...)`). Rendering has [two passes](../../why/render.md): all modes — structural and HTML-mapping alike — in the first pass (`renderToBemJson`); the second pass (`renderToHtml`) only serializes the result. Modes are covered in detail in [nu.ts templates](../templates.md).

## File structure

A single file `blocks/<name>/<name>.nu.ts` describes one block:

```ts
import { block } from '@nuckty/core';

interface ButtonProps {
    type?: 'button' | 'submit';
    size?: 's' | 'm' | 'l';
}

export default function templates(): void {
    // Block registration: the engine loads .nu.ts via dependencies and calls templates
    block<ButtonProps>('button')({
        tag: 'button',
        attrs: (n) => ({ type: n.props?.type ?? 'button' }),
        mods: (n) => ({ size: n.props?.size ?? 'm' }),
    });

    // Elements and modifiers — as separate declarations
    block('button').elem('icon')({ tag: 'span' });
}
```

The file exports `default function templates()` — the entry point. The engine calls it when loading the block. A template is registered through `block(...)` — it is bound to the current build's template collection.

## Modes

The whole block is described in one file. The engine applies all modes — structural and display alike — in a single pass over the tree (`renderToBemJson`); the second pass (`renderToHtml`) only serializes the result.

**Structural modes** change the tree:

```ts
// content: set the content
block<{ summary?: string }>('card').elem('body')({
    content: (n) => n.props?.summary ?? '',
});

// replace: replace the block
block<{ color?: string }>('badge').replace((n) => ({
    block: 'tag', mods: { color: n.props?.color ?? 'default' },
}));

// wrap: wrap it
block('root').wrap((n) => ({
    tag: 'html',
    content: [{ tag: 'head' }, { tag: 'body', content: n }],
}));
```

**Display modes** define how the node comes out in HTML:

```ts
// tag, attrs, cls, mods, elemMods, mix, js, bem
block('menu')({ tag: 'ul' });
block('menu').elem('item')({ tag: 'li' });
block<{ url?: string; id?: string }>('link')({
    attrs: (n) => ({ href: n.props?.url ?? '/', 'data-track': n.props?.id ?? '' }),
});
```

Markup minimization is not a mode. In the second pass, the engine minimizes the finished markup. For details, see [HTML output](../../out/html.md).

## Companion assets

A block's CSS and JS can sit next to `.nu.ts`:

```
blocks/button/
  button.nu.ts
  button.css
  button.js
```

CSS and JavaScript are included when the block is listed in the bundle declaration. Using a block in content alone does not add its assets. See [block dependencies](deps.md).

## Specificity and overriding

Declarations in one collection are ranked by [specificity](../templates.md): `block < elem < mod < elemMod < when`. At equal specificity, the last declaration wins. For example, one registration function can extend previously declared modifiers:

```ts
// after the base declaration in the same templates() function:
block('button')({ mods: (_n, next) => ({ ...next(), size: 'l' }) });  // always 'l'
```

When overriding through [levels](levels.md), only the last matching `.nu.ts` file is loaded. To retain base declarations, explicitly import and call their registration function inside your own `templates()` before adding declarations. Otherwise, the new file must define all required behavior.

## What is not in the file

- No manual registration of every block. The engine finds `.nu.ts` through dependencies, loads the file, and calls `templates`. For details, see [dependencies](deps.md).
- No CSS and JS imports inside `.nu.ts`. Assets sit next to the file, and the bundler finds them and adds them to the build via dependencies.
- No `applyNext()` call. Instead of a separate method, the mode function takes a `next` parameter: `(n, next) => ...`.
