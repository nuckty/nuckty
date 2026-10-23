# Text, tables and links

Write a page in Markdown; nuckty builds its HTML. Open the “Markdown source” tab to inspect and copy the exact input for each example.

## Headings and section links

The core supports emphasis, quotes, lists, links and code. Nested headings receive hierarchical anchors containing their parent sections. [Jump to this section](#headings-and-section-links) or [open the gallery](media.en.md) to try the links.

::example{sample=basics}

## Tables and task lists

GFM adds tables, strikethrough and task lists to Markdown. Write the text markup; the engine creates the table HTML.

::example{sample=gfm}

## Russian typography

The `typography-ru` extension inserts non-breaking spaces before em dashes in Russian prose. Code remains unchanged. This English example shows ordinary text and a code block; the Russian demo demonstrates the language-specific spacing.

::example{sample=typography}

## File links become page URLs

The source links to `media.en.md`. The `sitemap.yml` maps that file to `/media`, and nuckty writes that URL into the HTML. You can change a page URL in the sitemap while keeping links to its source file.

[Open gallery and grid](media.en.md) · [Try the engine](playground.en.md)
