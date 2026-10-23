# nu — the nuckty template engine

nu transforms a typed BEMJSON tree into HTML. Markdown content and document blocks use the same engine. The canonical guides describe the [data model](https://github.com/nuckty/nuckty-docs/blob/main/how/bemjson.md), [templates](https://github.com/nuckty/nuckty-docs/blob/main/how/templates.md), and [HTML output](https://github.com/nuckty/nuckty-docs/blob/main/out/html.md).

## Block module

A template file exports a default function. The loader invokes it in the current `Templates` collection; `block()` outside that context throws.

```ts
// blocks/menu/menu.nu.ts
import { block } from 'nuckty';

export default function templates(): void {
    block('menu')({ tag: 'ul' });
    block('menu').elem('item')({ tag: 'li' });
    block<{ trackId?: string }>('menu')({
        attrs: (node, next) => ({
            ...next(),
            'data-track': node.props?.trackId ?? '',
        }),
    });
}
```

Declare `menu` in `blocks/<bundle>/<bundle>.bemdecl.js` and list the bundle in `config/site.json`. The declaration is CommonJS; an ESM consumer can set `{"type":"commonjs"}` in `blocks/package.json`. The flat declaration selects blocks; the engine does not infer them from page content.

## Public data types

`BemNode` describes a node's `block`, `elem`, modifiers, tag, attributes, and content. The exact recursive type is:

```ts
import type { BemNode } from 'nuckty';
type BEMTree = BemNode | BEMTree[] | string | null | undefined | false;
```

`props` is not serialized automatically; templates can expose its values through content or attributes. `raw` inserts a trusted string without escaping or minimization. Arrays can nest; empty positions emit nothing.

## Modes and precedence

Output modes (`tag`, `content`, `attrs`, `mods`, `elemMods`, `mix`, `cls`, `js`, `bem`) set fields. Control modes (`replace`, `wrap`, `def`) change the tree. All modes apply before serialization.

In display modes and `content`, `next()` evaluates a less specific declaration or returns the original field at the end of the chain. Combine results explicitly, as with `...next()` above. In `replace`, `wrap`, and `def`, it returns the whole folded node rather than invoking a previous control mode.

Specificity adds one weight per selector kind: named block 1, named element 2, block modifier 4, element modifier 8, predicate 16. Wildcard block and element names add 0. At equal specificity, the later declaration wins. `.when()` expects a boolean predicate.

Across levels, only the last matching `.nu.ts` file is loaded. To retain base declarations, explicitly call their registration function in your `templates()`; `next()` does not load an earlier file.

## Isolated rendering

```ts
import { block, Templates, runWithTemplates, render } from 'nuckty';

const templates = new Templates();
runWithTemplates(templates, () => block('greeting')({ tag: 'p' }));
const tree = { block: 'greeting', content: 'Hello' };
const html = render(tree, { templates });
const resolved = render(tree, { templates, output: 'bemjson' });
```

`render` returns an HTML fragment by default. `document: true` adds `<!doctype html>` and two final newlines. The internal template and serialization passes are not separate package-root exports.

The serializer escapes text and attributes and omits supported optional end tags; it preserves `raw` and HTML comments and closes `p`. Validation of the complete artifact is a separate `nuckty validate` command supplied by the validator extension.
