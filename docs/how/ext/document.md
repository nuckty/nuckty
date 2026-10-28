# Document extension

A document handler turns engine-prepared data into a [BEMTree](../bemjson.md). It defines the [HTML](../../out/html.md) wrapper and places content. A build needs exactly one handler: missing or duplicate registration causes an error.

## API

`env.document.register(handler)` accepts `(data: DocumentData) => BEMTree | Promise<BEMTree>`. The data includes `page`, `content`, `sitemap`, `assets`, `alternates`, and optional `target` and `lang`. Site settings are available through `target?.data`.

The current HTML stage applies [templates](../templates.md) to content and serializes it first. Therefore `data.content` contains a `raw` node with ready markup; the original tree is available through `data.page.tree`.

## Minimal handler

```ts
// ext/document.ts
import type { NucktyEnv } from '@nuckty/core';

export function register(env: NucktyEnv): void {
    env.document.register((data) => ({
        tag: 'html', bem: false, attrs: { lang: data.lang ?? 'en' },
        content: [
            { tag: 'head', content: [
                { tag: 'meta', attrs: { charset: 'utf-8' } },
                { tag: 'title', content: data.page.title },
            ] },
            { tag: 'body', content: data.content },
        ],
    }));
}
```

List `./ext/document.ts` in `ext` in the global `config/config-nuckty.ts`. This example does not load CSS, JavaScript, or hreflang links: add them when needed or use the [standard root](../../ext/block/root.md). Load a custom handler instead of the root extension to avoid registering two handlers.

The core does not select a block from `page.layout`. The handler or site templates decide how to use that metadata. Unlike the minimal example, root uses a [block declaration](../blocks/deps.md).
