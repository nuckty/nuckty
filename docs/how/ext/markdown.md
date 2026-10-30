# Markdown extension

A Markdown extension adds [Markdown constructs](../markdown.md) through `env.markdown`. It registers a directive handler, a handler for an mdast node type or a remark plugin that transforms mdast before conversion to [BEMJSON](../bemjson.md).

## Directives

| Kind | Syntax |
|---|---|
| Text | `:name[label]{attrs}` |
| Leaf | `::name[label]{attrs}` |
| Container | `:::name{attrs}` … `:::` |

Write the name without a space after the colons. For compatibility, the engine also normalizes a plain `::: gallery` at the start of a line without attributes; this is not a general rule for all spaced directives.

An unknown directive falls back to plain content. Attributes are available as `node.attributes`; mdast children are `node.children`, typed as `unknown[]`.

## API and example

`env.markdown.directive(name, handler)` accepts a `DirectiveHandler`: `(node: DirectiveNode, env: MarkdownOptions, convert: DirectiveConverters) => BEMTree | null`. `node.type` is the directive form: `containerDirective`, `leafDirective` or `textDirective`. The second argument holds the page's Markdown options: image mapping, source file and the target language `lang`. `convert.inline(children)` and `convert.blocks(children)` render the directive's children to BEMJSON the way the page renders ordinary Markdown, with link and image resolution. Returning `null` enables normal content conversion.

The example deliberately reduces content to text; formatting and links are not retained. For richer content, implement an appropriate node transformation.

```ts
import type { NucktyEnv } from '@nuckty/core';

interface TextNode {
    type?: string;
    value?: string;
    children?: TextNode[];
}

function text(nodes: TextNode[]): string {
    return nodes.map((node) => node.type === 'text' || node.type === 'inlineCode'
        ? node.value ?? ''
        : text(node.children ?? [])).join('');
}

export function register(env: NucktyEnv): void {
    env.markdown.directive('callout', (node) => ({
        block: 'callout',
        mods: { type: node.attributes?.class ?? 'note' },
        content: text((node.children ?? []) as TextNode[]),
    }));
    env.markdown.directive('badge', (node) => ({
        block: 'badge',
        mods: { type: node.attributes?.type ?? 'new' },
        content: text((node.children ?? []) as TextNode[]),
    }));
}
```

Use `:::callout{.warning}` with a paragraph inside, or `::badge[1.2]{type=new}`. Add `callout` and `badge` to the [bemdecl](../blocks/deps.md) and provide their [templates](../templates.md) and styles on the [levels](../blocks/levels.md). Producing a node does not add its block to the declaration.

`env.markdown.node(type, handler)` maps every mdast node of `type` to BEMJSON before the core conversion of that type; the handler has the same arguments as a directive handler, and returning `null` keeps the core conversion. A remark plugin may insert nodes of its own type for such a handler. Handlers return block nodes, not HTML strings: the markup comes from the block's templates.

`env.markdown.use(plugin)` accepts a remark plugin for arbitrary mdast transforms. For example, [video](../../ext/markdown/video.md) turns `@[provider](id)` links into `video` nodes. Gallery and grid directives combine Markdown and block extensions in one package; implementations are listed in the [catalog](../../ext/markdown.md).
