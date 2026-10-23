# BEMJSON as the data model

## Decision

Represent page content and layout as a typed [BEMJSON tree](../how/bemjson.md). The nu engine applies templates to the tree and serializes the result as HTML.

## Context

The intermediate representation determines how templates compose, how the compiler checks their inputs, and where escaping happens. nuckty needs the same block model for Markdown content and page layout.

## Alternatives

**String templates.** Engines such as Nunjucks support escaping and template inheritance; [Nunjucks enables autoescaping by default](https://mozilla.github.io/nunjucks/api.html). They could render a static site, but a string-based result would need a separate structural representation for nu selectors and tree inspection.

**JSX.** JSX can describe typed components and does not itself require a browser runtime. Its component model is a viable alternative, but nuckty chooses selectors over named blocks, elements, and modifiers for template overriding.

**HTML directly from Markdown.** A Markdown-to-HTML compiler simplifies content rendering, but its output cannot be transformed with BEM selectors without first parsing HTML or retaining another tree.

## Argument

`BemNode` describes a node's structure and template data. `BEMTree` is a recursive union of nodes, text, arrays, and empty positions. [nu templates](../how/templates.md) can replace or wrap a node before serialization, and the resolved tree can be obtained with `render(tree, { templates, output: 'bemjson' })`.

The same renderer processes Markdown content and document blocks. In the current HTML stage, content is rendered first and passed to the document handler as a `raw` node; this is a shared rendering model, not a guarantee that the entire page remains one tree until the final serialization.

The serializer centralizes text and attribute escaping and [HTML minimization](../out/html.md). Template authors still need to choose valid HTML structures and treat `raw` as trusted input.

## Consequences

Templates operate on data rather than concatenated markup. [Block declarations](../how/blocks/deps.md) determine which templates and assets are loaded.

`props` is available to templates but is not serialized automatically. Templates may expose its values; see the [data model guide](../how/bemjson.md). It may contain a `Map`, whose entries plain `JSON.stringify` does not preserve, so lossless tree serialization can require a custom conversion. `raw` is emitted without escaping or minimization. [Two-pass rendering](render.md) makes the resolved tree available independently of its HTML representation.
