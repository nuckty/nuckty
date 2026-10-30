---
"@nuckty/core": minor
"@nuckty/ext-block-grid": minor
---

Directive handlers receive `convert.inline` and `convert.blocks`; grid cells render links, emphasis, inline code and images like ordinary paragraphs instead of flattening them to text. Code that calls a `DirectiveHandler` directly, such as a test, must now pass the converters as the third argument.
