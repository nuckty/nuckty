# Document extensions

A document extension registers a handler through `env.document`. The handler receives page data and returns a document [BEMTree](../how/bemjson.md). See the [guide](../how/ext/document.md) for the contract and an example.

## Available implementation

[`@nuckty/ext-block-root`](block/root.md) combines document and block extensions. It registers the standard handler and adds a level containing the `root` template. The current family has no separate `@nuckty/ext-document-*` package.

A site can load its own local handler instead of root. Each build needs exactly one handler.
