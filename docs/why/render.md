# Two-pass rendering

## Decision

Separate template application from HTML serialization. The public `render` function returns HTML by default; `output: 'bemjson'` returns the resolved [BEMJSON tree](../how/bemjson.md).

Internally, `renderToBemJson` applies all structural and display modes, then `renderToHtml` serializes the result and performs [HTML minimization](../out/html.md). These internal functions are not separate exports from the package root.

## Context

If templates and serialization run in one traversal, the serializer needs to know the result of templates on neighboring nodes. This couples template selection with decisions such as whether to omit a closing `li` tag. An explicit intermediate tree gives the serializer final tags and attributes.

## Alternatives

**One combined pass.** This avoids an intermediate result but couples template application with serialization and makes the resolved tree harder to inspect independently.

**Separate template languages for data and HTML.** This can separate responsibilities, but would require two authoring contracts. nuckty keeps one [nu declaration syntax](../how/templates.md).

## Argument

The first pass resolves every template mode, including `tag`, `attrs`, `content`, `replace`, and `wrap`. The second applies no templates. Each part can be inspected and tested through its own result.

Template authors describe a block in one `.nu.ts` file. The engine prevents a control template from repeatedly applying to the same node; arbitrary recursive user code can still recurse.

## Consequences

Use `render(tree, { templates, output: 'bemjson' })` to inspect the resolved tree and `render(tree, { templates })` for an HTML fragment. Add `document: true` to include the doctype and document ending.

There is one rendering behavior for development and production. A second pass does not guarantee that arbitrary input is valid HTML: validation remains a separate [command](../ext/command/validate-vnu.md).

