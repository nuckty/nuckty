# Blocks

A block is a reusable unit of interface: a menu, a button, a card, the page wrapper. In nuckty, a block is described by a single `.nu.ts` file, with `.css` and `.js` alongside when needed. Both the [page layout](../templates.md) and the `root` [HTML](../../out/html.md) wrapper are blocks.

## How a block is structured

- [Block structure](authoring.md) — the structure of a `.nu.ts` file, modes, how a block becomes HTML.
- [Block dependencies](deps.md) — how the engine finds blocks through dependencies, with no manual registration.
- [Block levels](levels.md) — where the engine looks for block files and what the level order is.

## Block or content?

A block is interface code. Page content (an article, documentation) is Markdown, which the engine converts into a tree of blocks. Interface elements live in `blocks/`, texts in `.md` files from `content/`. Markdown constructs (`:::gallery`) connect content and blocks: this is content syntax that expands into blocks through [markdown extensions](../ext/markdown.md).

## root and page

Block names are allocated as follows:

- **`root`** — the HTML page wrapper (`<html>`, `<head>`, `<body>`). It comes from the [`@nuckty/ext-block-root`](../../ext/block/root.md) extension.
- **`page*`** — the user layer. The names `page`, `page-index`, `page-about` and the like belong to the site; nuckty does not take them.
