---
"@nuckty/core": minor
"@nuckty/ext-block-gallery": minor
"@nuckty/ext-block-grid": patch
---

The Markdown bridge emits `article` entities with their data in `props` and no tags, attributes or HTML strings; the core registers default templates for them (exported as `markdownTemplates`) before the site's templates, so a site can change any Markdown markup. The copy-code button is no longer part of the core output. Inline HTML stays raw, with image paths mapped in the bridge. The document handler now receives the content tree and the page renders in one pass. Directive handlers return a `BEMTree` and receive the page's Markdown options, including `lang`; `env.markdown.node(type, handler)` maps mdast node types to BEMJSON. The gallery emits data only, its templates build the markup, the lightbox is labelled in the page language and opens on the dialog's `open` state; `data-group` is gone.
