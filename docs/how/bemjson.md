# Data model: BEMJSON

Every page in nuckty is a tree of nodes. The node type is `BemNode`; the tree as a whole is `BEMTree`. The same engine processes the entire tree: from a Markdown paragraph to the `<html>` page wrapper. The [data model decision](../why/bemjson.md) explains why a tree and not strings.

## Three concepts from BEM

The model inherits the terminology of BEM — a methodology that describes an interface through named entities of three kinds:

- **Block** — a standalone component: a menu, a button, an article.
- **Element** — a part of a block that does not exist outside it: a menu item, an article heading.
- **Modifier** — a variant of a block or element: size, theme, state.

From these three concepts the engine assembles CSS classes (`menu`, `menu__item`, `menu_size_m`) and uses the same names to find the matching templates. From here on, the words "block", "element", and "modifier" appear constantly.

## The BemNode

A node is a typed object. TypeScript can check its fields against `BemNode` during a static type check. The CLI transpiles configuration, extensions, and block modules without checking their types; run TypeScript checks separately.

```ts
import type { AttrMap, BEMTree, BemEntity, ModMap } from 'nuckty';

interface BemNode {
    block?: string;          // block name: 'article', 'button', 'root'
    elem?: string;           // block element: 'heading', 'item'
    mods?: ModMap;           // block modifiers: { size: 'm', view: 'action' }
    elemMods?: ModMap;       // element modifiers
    mix?: BemEntity | Array<BemEntity | string> | string;  // mix in another block's classes
    content?: BEMTree;              // child tree, including empty positions
    tag?: string | false;    // HTML tag; false — do not output the tag
    attrs?: AttrMap;         // HTML attributes
    cls?: string;            // extra (non-BEM) class
    js?: boolean | Record<string, unknown>;   // data for the block's client-side JavaScript
    bem?: boolean;           // whether to generate BEM classes (true by default)
    props?: Record<string, unknown>;  // template data; not serialized automatically
    raw?: string;            // trusted string: not escaped, not minimized
    tightList?: boolean;     // compatibility only; HTML controls optional li tags
}
```

### Key fields

- **`block` / `elem`** — the BEM entity. `block: 'menu'` is a block; `block: 'menu', elem: 'item'` is its element. The engine assembles the CSS class from these: `menu`, `menu__item`.
- **`mods` / `elemMods`** — modifiers. `{ size: 'm' }` becomes the class `menu_size_m`. A modifier defines a variant of a block or element.
- **`content`** — a recursive `BEMTree`: a node, text, nested arrays, or empty `null`, `undefined`, and `false` positions.
- **`tag`** — the [HTML](../out/html.md) tag. By default the engine outputs `<div>`, but a template can set any tag. `false` means "no tag, content only".

### How classes are assembled

From `block`, `elem`, `mods`, `elemMods`, and `mix` the engine composes the class string according to the classic BEM scheme:

```
block                       → 'menu'
block + elem                → 'menu__item'
block + mods                → 'menu_size_m'
block + elem + elemMods     → 'menu__item_active'
mix                         → another block's classes: 'menu__item button'
```

The separators are the standard BEM ones: `__` before an element, `_` before a modifier. There is one naming scheme, with no variants. The exported `classicPreset` is immutable; changing the engine separators through it is unsupported.

### Two special fields

**`props`** — data for templates: page parameters, configuration, hreflang alternates. The field itself is not serialized into HTML. A template reads `n.props` and can expose its values through `content` or `attrs`; the standard `root`, for example, uses them for the document title and language. This field does not hide data from visitors.

**`raw`** — a field for trusted strings. The engine inserts the content without escaping or minimization: ready-made HTML, embedded analytics scripts, SVG. **Warning:** do not pass untrusted input in `raw` — the engine will output it unprocessed.

## The tree as data

The exported recursive type is:

```ts
import type { BemNode } from 'nuckty';

type BEMTree = BemNode | BEMTree[] | string | null | undefined | false;
```

The structural fields are JSON-like data. Values carried in `props` can include non-JSON objects such as `Map`; serialization requires the caller to handle them. You can save the tree, log it, cache it, or pass it to another tool. The `output: 'bemjson'` mode returns the finished tree instead of turning it into HTML. For details, see the [two-pass rendering decision](../why/render.md).

```ts
// Get the tree instead of HTML
const tree = render(page, { templates, output: 'bemjson' });
// tree is a BEMTree: a node, text, an array, or an empty value
```

This is useful for debugging ("why did the page come out this way?") and custom tools that cache by tree hash. The ordinary `nuckty build` command clears the output directory and rebuilds the artifact; the engine does not perform incremental builds automatically.

## Where the tree comes from

The tree has two sources.

1. **Markdown.** The remark parser turns `.md` into mdast (a typed Markdown tree), and the mdast → BEMJSON conversion builds a tree of blocks from it. The author writes Markdown; the engine receives a `BEMTree`. See [Markdown](markdown.md).

2. **Page layout.** The block template (through the `wrap`, `replace`, and `content` modes) builds the page wrapper tree. The `root` block wraps the content in `<html>`. See [nu templates](templates.md).

In the current HTML stage, content is serialized first and passed to the document handler through `raw`. The common model lets content and layout use one renderer, but does not exclude an intermediate HTML string.
