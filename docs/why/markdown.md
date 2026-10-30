# The Markdown engine

## Decision

Use remark/unified to parse Markdown into mdast, then transform it into a [BEMJSON tree](../how/bemjson.md). This is the implemented [pipeline](../how/pipeline.md) in 1.0.0.

## Context

nuckty needs structural Markdown output for its template engine, plus extension points for directives and content transformations. A Markdown-to-[HTML](../out/html.md) string alone does not provide that structure.

## Alternatives

**A token-stream parser.** A bridge can reconstruct nesting from tokens, but must keep track of paired opening and closing tokens and their context.

**An HTML-producing compiler.** This provides ready markup, but structural nu.ts templates would require another representation or an HTML parser.

**A typed syntax tree.** mdast represents nested Markdown nodes directly. The bridge can map headings, lists, links, and [images](../out/images.md) by node type.

## Argument

remark-parse builds mdast; remark-gfm and remark-directive add the syntax nuckty supports. unified composes parsing and transformations. The bridge then produces nodes for the same [nu renderer](../how/templates.md) that processes document blocks.

[Markdown extensions](../how/ext/markdown.md) can register a remark plugin, a directive handler or a handler for an mdast node type. Content-specific features such as videos, galleries, and Russian typography remain separate packages.

The choice is based on the structure and extension contract. This documentation does not claim a speed advantage without a reproducible benchmark of the complete build.

## Consequences

The Markdown bridge and its transformations use mdast. Extension authors receive mdast children, not HTML or BEMJSON children, in directive handlers.

Russian typography is optional. An English-language site can omit that extension. For supported syntax and link-resolution behavior, see the [Markdown guide](../how/markdown.md).

