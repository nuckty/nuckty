# Markdown entities carry data; templates own the markup

## Why

The Markdown bridge fixed HTML tags, attributes and prebuilt HTML strings (inline code, a copy button with English labels) in the tree. A tag in the data outranks any template, so sites could not change Markdown markup; extensions rendered HTML strings with private template collections; and the page content reached the document handler as one serialized string.

## What Changes

- **BREAKING** The bridge emits `article` entities with their data in `props`; the core registers default templates for them before the site's templates. Only HTML written in the Markdown source stays `raw`, with its logical image paths mapped in the bridge.
- **BREAKING** The copy-code button is no longer part of the core output.
- **BREAKING** Directive handlers return a `BEMTree` or null and receive the page's Markdown options, including the target language.
- `env.markdown.node(type, handler)` maps mdast node types, including types inserted by remark plugins, to BEMJSON.
- **BREAKING** The document handler receives the content tree and the document renders in one pass.
- The gallery handler emits data only; the gallery and lightbox templates build the markup with labels in the page language.
