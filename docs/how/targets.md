# Targets and hreflang

nuckty can build several targets from one repository: sites with separate languages, domains, and output directories. For related targets, the engine prepares `alternates`; the document handler renders hreflang markup.

## What is a target

A target is described in `config-nuckty.ts`:

```ts
import { defineNucktyConfig } from '@nuckty/core';

export default defineNucktyConfig({
    targets: {
        'site-ru': { configDir: 'config/ru/', outDir: 'site-ru/', lang: 'ru', host: 'example.ru', group: 'site' },
        'site-en': { configDir: 'config/en/', outDir: 'site-en/', lang: 'en', host: 'example.com', group: 'site' },
    },
    ext: [/* ... */],
});
```

`lang` sets the document language; it does not translate Markdown or select a source file automatically. For this example, prepare separate configurations in `config/ru/` and `config/en/`: their sitemaps should select the appropriate sources, such as `index.ru.md` and `index.md`. With the same `configDir`, both targets read the same [sitemap](sitemap.md) and page set. The global `config/config-nuckty.ts` remains shared.

| Field | Purpose |
|---|---|
| `configDir` | Target configuration directory: `site.json`, `sitemap.yml`, `levels.json`, and `external.json`. |
| `outDir` | Where the build artifact is written. |
| `lang` | The language that a document handler can emit as `<html lang>`. |
| `data` | Site settings available through `DocumentData.target.data`. |
| `host` | The canonical domain. |
| `group` | The name of a group of related targets. It exists specifically for hreflang: without `group`, the engine builds no alternates. |

The content root is not configured in the target: the engine reads `.md` from the first level in [levels.json](blocks/levels.md) (`content/` by default). Targets have no fields of their own for this.

`nuckty build site-ru` builds the Russian version, `nuckty build site-en` the English one. `nuckty build` without an argument builds them all.

## Related targets and hreflang

Targets with the same `group` and different `lang` values are considered related. Targets without a `group` are not matched with anything. The engine constructs the same route on related hosts and passes these URLs (`alternates`) into the rendering context. It reads the related target's `sitemap.yml`: a page that is missing there gets no alternate, and an existing one contributes its title. A related target without a `sitemap.yml` is linked without a check and with an empty title:

```ts
type Alternates = Map<string, { url: string; title: string; host: string }>;
```

For example, the page `/catalog` exists in both `site-ru` and `site-en` (both targets in one group). While building `site-ru`, the engine finds `/catalog` in the `site-en` sitemap and passes into the context:

```
const alternates = new Map([
    ['en', { url: 'https://example.com/catalog', title: 'Catalog | Home', host: 'example.com' }],
]);
```

The current target is not included in the map — it holds only related pages. Language tags are compared without letter-case differences: `en-US` and `EN-us` identify the same tag; `en-GB` remains a distinct regional tag. Returned keys retain the authored spelling.

## When you need group

`group` is an hreflang switch, not a constraint. The rule is simple:

- **You need links between language versions** — give all targets of one site the same `group`. Without `group`, the engine builds no alternates at all.
- **You do not need hreflang** — do not set `group`. A target without a group is not matched with anything.

The same `group` means exactly "these are language versions of one site." Different groups are independent sites that need no matching.

Example: a company repository holds the main site in two languages plus a separate conference mini-site:

```ts
targets: {
    // Main site — two language versions, linked with hreflang
    'main-ru': { configDir: 'config/main-ru/', outDir: 'site/main-ru/', lang: 'ru', host: 'company.ru', group: 'main' },
    'main-en': { configDir: 'config/main-en/', outDir: 'site/main-en/', lang: 'en', host: 'company.com', group: 'main' },
    // Conference — a separate site, its own group, to keep it separate from the main one
    'event': { configDir: 'config/event/', outDir: 'site/event/', lang: 'ru', host: 'event.company.ru', group: 'event' },
}
```

**If there is one site in one language** — `group` is not needed: there are no alternates anyway.

## The engine prepares the data, the block renders the markup

The engine passes `alternates` to the document handler. The standard `root` template uses them for `<link rel=alternate>` tags inside `head`; a custom handler or template can render them differently.

Example `head` markup built from the `alternates` map:

```ts
{ tag: 'head', content: [
    // ...meta...
    ...[...alternates.entries()].map(([lang, a]) => ({
        tag: 'link',
        attrs: {
            rel: 'alternate',
            hreflang: lang,
            href: a.url,
        },
    })),
]}
```

Responsibilities are separated: the engine does not hard-code search markup, and the block decides how to present it. `hreflang="x-default"`, translating the `title` — that is the block's job.

## When you need this

Multiple targets are useful when the same blocks, [templates](templates.md), and [pipeline](pipeline.md) are reused across several language or domain versions. If there is one site in one language, a single target is enough, and the engine creates no hreflang links.
