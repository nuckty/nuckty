# nu.ts templates

A template describes how a block or element turns into [HTML](../out/html.md). Templates are written in **nu** — nuckty's internal language, in `.nu.ts` files. The syntax is based on the `block()(...)` call.

Why a dedicated syntax instead of "just functions"? A dedicated syntax is more concise for the declarative description of blocks and establishes a system of modes and specificity. For details, see the [data model decision](../why/bemjson.md) and [two-pass rendering](../why/render.md).

## Basic syntax

A `.nu.ts` file exports a default function. The loader invokes it inside the current template collection; `block` outside that context throws. Place the declarations below inside the corresponding block's `templates()` function: for example, `block('card')` belongs in `blocks/card/card.nu.ts`. One file describes one block and its elements.

```ts
import { block } from '@nuckty/core';

export default function templates(): void {
    block('menu')({ tag: 'ul' });
    block('menu').elem('item')({ tag: 'li' });
}
```

### Conditional predicate

`.when(...)` is an arbitrary predicate. The template applies only when the predicate is true:

```ts
block<{ submenu?: import('@nuckty/core').BEMTree }>('menu').elem('item').when((n) => Boolean(n.props?.submenu))({
    content: (n, next) => [
        { block: 'menu', content: n.props?.submenu ?? null },
        next(),
    ],
});
```

## Modes

The two passes use modes differently. All template modes — structural and display modes alike — apply in the first pass, `renderToBemJson`; they turn the source tree into a resolved one. The second pass, `renderToHtml`, applies no templates at all: it serializes the finished tree and minimizes the markup.

### Structural modes

These shape the tree: they change the node and its content.

| Mode | Action |
|---|---|
| `content` | Sets the node's content |
| `replace` | Replaces the node with another one |
| `wrap` | Wraps the node (the result contains the original node) |
| `def` | Defines the node entirely, when the other modes are not enough |

```ts
// replace: swap the block for another
block<{ color?: string }>('badge').replace((n) => ({
    block: 'tag',
    mods: { color: n.props?.color ?? 'default' },
}));

// wrap: wrap it
block('card').wrap((n) => ({
    block: 'card-wrapper',
    content: n,
}));
```

### HTML display modes

These define how the node comes out in serialization: tag, attributes, classes.

| Mode | Action |
|---|---|
| `tag` | Sets the HTML tag |
| `attrs` | Sets attributes |
| `cls` | Sets the extra (non-BEM) class |
| `mods` | Sets block modifiers |
| `elemMods` | Sets element modifiers |
| `mix` | Mixes in another block's classes |
| `js` | Passes data to client-side JavaScript |
| `bem` | Enables or disables BEM classes |

A display-mode or `content` callback that returns `undefined` removes the field from the resolved node. Omitting the mode leaves the source field unchanged; to keep the fallback value explicitly, return `next()`.

## next()

In display modes and `content`, `next()` returns the result of a less specific declaration, or the original node field at the end of the chain. A mode replaces the field; the author combines its result with `next()` explicitly, for example with spread. Calling it does not merge values:

```ts
// attrs: add to the existing attributes without overwriting them
block<{ trackId?: string }>('button')({
    attrs: (n, next) => ({
        ...next(),
        'data-track': n.props?.trackId ?? '',
    }),
});
```

In the control modes `replace`, `wrap`, and `def`, `next()` returns the whole node with display modes and `content` already applied. It does not call a less specific control mode. For example, a more specific `wrap` does not invoke the previous wrapper.

## Specificity

Specificity adds weights by selector kind: named block 1, named element 2, block modifier 4, element modifier 8, predicate 16. Repeating a condition of the same kind does not add that weight again:

```
block  <  elem  <  mod  <  elemMod  <  when
```

That is why a template with `.when()` is the most specific: an arbitrary predicate gets more weight than a match by block, element, or modifier. `block('*')` adds no block weight, and `elem('*')` adds no element-name weight and matches only nodes with an element name. Its other conditions still contribute their weights: a bare wildcard yields to a bare named block, while `block('*').when(...)` can outrank it. At equal specificity, the engine picks the template declared later.

This rule applies to declarations in one `Templates` collection. Across [levels](blocks/levels.md), only the last matching `.nu.ts` file is selected: earlier files are not loaded, and `next()` cannot reach them.

## One file — all modes

An entire block is described in a single `.nu.ts` file: structural and display modes apply in one pass over the tree, and serialization requires no declarations at all. The engine resolves the declarations itself; the author never needs to split a block into parts.

Unlike bem.info, a block does not have to be described in two files (`.bemtree.js` and `.bemhtml.js`).

## How a block finds its templates

The `.nu.ts` file is wired in through the [dependencies (`deps`)](blocks/deps.md) mechanism: the bundle's bemdecl file lists the blocks, and the engine loads the `.nu.ts` files of the listed blocks. No manual registration is required. For details, see [block structure](blocks/authoring.md).

For isolated rendering, create a collection explicitly:

```ts
import { block, Templates, runWithTemplates, render } from '@nuckty/core';

const templates = new Templates();
runWithTemplates(templates, () => block('greeting')({ tag: 'p' }));
const html = render({ block: 'greeting', content: 'Hello' }, { templates });
```

The package root exports `render` for both HTML and resolved BEMJSON; the internal `renderToBemJson` and `renderToHtml` passes are not separate package-root exports. See the [data model](bemjson.md) for `output: 'bemjson'` and [HTML output](../out/html.md) for document rendering.
