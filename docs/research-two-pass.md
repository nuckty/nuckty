# Two-Pass Rendering: bemtree + bemhtml vs nuckty's Single Pass

> Historical research from an earlier implementation. The descriptions of the current engine and the proposed migrations below are historical, not the 1.0.0 contract. See the current [nu reference](nu.md) and [documentation review](../../plans/2026-10-05-documentation-review/RESEARCH.md).

> Research note for the pre-1.0.0 decision on whether to formalize or split
> nuckty's rendering pipeline into two BEM-style passes.

## What bemhtml and bemtree are in original BEM

In the BEM methodology (as implemented by `bem-xjst`), **BEMTREE** and
**BEMHTML** are two separate template technologies with distinct roles:

### BEMTREE: data -> BemJSON tree

BEMTREE templates transform input data (page model, site model, content) into a
**BemJSON tree** -- a JSON tree of `{ block, elem, mods, content, ... }` nodes.
This is the "data to tree" pass. Templates use the same `block('x')(...)` syntax
as BEMHTML, but their output is BemJSON, not HTML.

Example from `bem.info` (`blocks/common/root/root.bemtree.js`):

```js
block('root').replace()(function() {
    var data = this.data = this.ctx.data,
        page = data.page;

    return {
        block: 'page',
        lang: data.lang,
        title: page.head.title,
        head: [
            { elem: 'css', url: data.root + '/' + page.bundle + '.min.css' },
            { elem: 'meta', attrs: { name: 'viewport', content: 'width=device-width' } }
        ],
        scripts: [
            { elem: 'js', url: data.root + '/_client/client.js' }
        ]
    };
});
```

This template reads the raw page model (`this.ctx.data`) and constructs the
page's BemJSON structure: which blocks to include, in what order, with what
mods.

### BEMHTML: BemJSON -> HTML

BEMHTML templates map BemJSON nodes to HTML. This is the "tree to markup" pass.
Templates declare how a block/elem renders: its tag, attrs, class composition,
content shaping. The output is an HTML string.

Example from `bem.info` (`lib/article.bemhtml.cjs`):

```js
module.exports = function() {
    block('article')(
        replace()(function() {
            this.hljs = this.ctx.hljs;
            this.slugger = this.ctx.slugger;
            return this.ctx.content;
        }),
        elem('heading')(
            tag()(function() {
                return 'h' + this.elemMods.level;
            }),
            attrs()(function() {
                return { id: this.ctx.anchor };
            }),
            content()(function() {
                return [
                    { elem: 'heading-anchor', attrs: { href: '#' + this.ctx.anchor } },
                    this.ctx.content
                ];
            })
        ),
        elem('paragraph').tag()('p'),
        elem('list')(
            tag()('ul'),
            elemMod('ordered', true).tag()('ol')
        ),
        elem('list-item').tag()('li')
    );
};
```

This is purely declarative: "article heading = hN with an id", "article
paragraph = p", "article list = ul or ol". No data fetching, no page-model
logic. Just BemJSON-to-tag mapping.

### Same syntax, different role

Both technologies use the `bem-xjst` engine and the same `block('x')(...)`
syntax with modes (`tag()`, `content()`, `attrs()`, `replace()`, `match()`).
The difference is the input and output:

| Technology | Input | Output | Role |
|---|---|---|---|
| BEMTREE | Page/site data model | BemJSON tree | Data shaping, layout composition |
| BEMHTML | BemJSON tree | HTML string | Tag/attr/class mapping |

In `bem-xjst` v8.x (the current version, npm `bem-xjst@8.10.0`), they are
separate compilation targets: `require('bem-xjst').bemhtml` and
`require('bem-xjst').bemtree` produce different template compilers.

## How bem.info uses both passes

The `bem-site/bem.info` repository (active, last updated 2026-07-13) uses both
technologies in sequence. Verified via GitHub API (`gh api repos/bem-site/bem.info`):

### Build pipeline

From `package.json`:

```json
{
    "devDependencies": {
        "bem-xjst": "^8.10.0",
        "gorshochek": "git+https://github.com/bem-site/gorshochek.git#master",
        "md-to-bemjson": "1.0.0"
    }
}
```

From the README (architecture section), the build does:

1. Data loading (gorshochek tasks: merge models, load content from GitHub/local)
2. `transformMdToBemjson` -- markdown converted to BemJSON via the
   `md-to-bemjson` package (which itself uses `remark` with a custom
   `remark-bemjson` compiler)
3. BEMTREE templates compiled via `bem-xjst` -- data model -> BemJSON page tree
4. BEMHTML templates compiled via `bem-xjst` -- BemJSON -> HTML
5. CSS compilation (PostCSS + autoprefixer), JS bundling (Vite), minification

From `lib/data-builder.cjs`:

```js
.then(tasks.docs.transformMdToBemjson(model, {
    mdToBemjson: {
        augment: { scope: 'article' }
    }
}))
```

### File layout: .bemtree.js and .bemhtml.js coexist

The `blocks/` directory contains both technologies side by side:

```
blocks/common/
    article/
        article.bemtree.js    -- content insertion: { html: page.content }
        article.css
    page/
        page.bemtree.js       -- full page structure: header, nav, main, footer
        page.css
    root/
        root.bemtree.js       -- data -> page BemJSON (reads page model, emits page block)
        root.bemhtml.js       -- passthrough: return this.ctx.content (freeze)
```

The `lib/article.bemhtml.cjs` file (159 lines) contains the BEMHTML templates
that map the article BemJSON nodes (produced by `md-to-bemjson`) to HTML tags
and attrs. This is the explicit BemJSON-to-HTML layer.

### Key observation

`bem.info` has a **three-stage** pipeline:

1. Markdown -> BemJSON (via `md-to-bemjson`/remark)
2. Data model + BemJSON -> page BemJSON tree (via BEMTREE templates)
3. BemJSON tree -> HTML (via BEMHTML templates)

Stages 2 and 3 are both `bem-xjst` but compiled as separate targets with
separate template files.

## Benefits of the two-pass separation

### 1. Layer separation

BEMTREE templates focus on "what blocks make up this page, in what order, with
what data". BEMHTML templates focus on "how does block X render as HTML". These
are different concerns. The `page.bemtree.js` in bem.info is 60+ lines of
layout composition logic (which blocks, what mix, what content). The
`article.bemhtml.cjs` is 159 lines of tag/attr declarations. Neither concerns
itself with the other's job.

### 2. Conciseness of BEMHTML declarations

BEMHTML templates are extremely terse:

```js
elem('paragraph').tag()('p');
elem('list-item').tag()('li');
elem('strong').tag()('strong');
```

Each line is one mapping. No layout logic, no data fetching. The declarative
density is high because the scope is narrow.

### 3. Reuse

BEMHTML templates can be reused across different BEMTREE outputs. The same
`article.bemhtml.cjs` works regardless of how the article BemJSON was produced
(md-to-bemjson, hand-written, or from a different data source).

## Evaluating two passes for nuckty (criterion: best long-term TS fit, not sunk cost)

The question is not "how much already-written code would a split cost" — that
is sunk cost and explicitly out of scope. The question is: **is a single
pass, where template application and HTML emission are fused in one tree
walk, the best architecture to maintain and extend in TypeScript for years —
or is an explicit, typed BemJSON intermediate (a real bemtree/bemhtml
boundary) better?**

### What a single pass costs you long-term

In the current `render` (`src/bem/render.ts`), templates apply and HTML is
emitted in one fused walk. Two consequences matter for maintainability:

1. **No inspectable tree-before-HTML.** There is no first-class "the BemJSON
   of this page" you can look at, test, cache, or hand to a tool. The tree is
   materialized only as HTML. Debugging "why did this page render this way"
   means reading the renderer's internals, not reading a tree.
2. **Templates and the serializer are coupled.** The optimizer's context
   (the two-pass lookahead for `</li>`/`</p>` omission) is entangled with
   template application (`shouldEmitClose` needs the NEXT sibling's FINAL
   tag, which is only known after templates apply). Change the template
   model and the serializer's lookahead changes with it. That coupling is
   the hard part of `render.ts` and the most bug-prone.

### What a typed BemJSON intermediate buys you

A real two-pass shape, where pass 1 produces a fully-resolved, typed BemJSON
tree and pass 2 serializes that frozen tree to HTML:

1. **A first-class, inspectable tree.** `render(tree, { output: 'bemjson' })`
   returns the resolved BemJSON without serializing — the user's requested
   feature. The tree is plain typed data: you can snapshot it, diff it in
   tests, cache it by content hash for incremental builds, log it.
2. **Decoupled serializer.** Pass 2 takes a frozen, already-templated tree
   and only emits HTML. The optimizer's lookahead operates on a stable
   input (every tag is final), which is simpler and more local than the
   current fused lookahead. The serializer becomes a pure function of a
   typed tree — easier to test and reason about.
3. **Decoupled template engine.** Pass 1 is "apply templates, resolve to a
   final BemJSON tree"; it has no notion of HTML, void tags, or closing-tag
   omission. That is a cleaner contract for the nu API and for plugin
   authors, and it lines up with BEM's own separation (bemtree = data→tree,
   bemhtml = tree→HTML).
4. **Composability with the markdown decision.** The recommended markdown
   engine (see `docs/research-markdown-engine.md`) is remark/unified, whose
   model is exactly "produce a typed AST, then transform it." bem.info's own
   pipeline uses `md-to-bemjson` (remark-based) for the markdown→BemJSON
   stage, then BEMTREE, then BEMHTML. Adopting remark for the first stage
   and a typed BemJSON intermediate for the engine puts nuckty on the same,
   well-trodden, typed path bem.info already validated.

### Is the split the *best* fit, or just a nice-to-have?

For a TS-first engine meant to be maintained for years, the split is the
better fit:

- It makes the engine's two genuine concerns — "shape the tree" and
  "serialize the tree" — into two typed, independently testable pieces
  instead of one fused walk. Two small, pure functions beat one large,
  stateful one for long-term support.
- It removes the lookahead coupling that is the hardest part of the current
  renderer. Pass 2 sees only final tags.
- It gives a first-class BemJSON artifact, which is independently useful
  (debugging, caching, the `output: 'bemjson'` mode, future non-HTML
  serializers like XML/sitemap or a search index).
- It matches the BEM lineage the engine claims (bemtree/bemhtml) in a
  TS-native form — one engine, two phases — rather than leaving that
  lineage as documentation-only folklore.

The single-pass "just fuse it" design is simpler in line count but
transfers complexity into the renderer's lookahead and makes the tree a
non-first-class value. For a project betting on types and long-term
maintainability, the explicit, typed boundary is the better trade.

### Recommended architecture

Split `render` into two typed phases, one engine:

1. **`renderToBemjson(tree, { templates }): BemNode`** — apply all templates
   (output modes `tag/content/attrs/mods/...`, control modes
   `def/replace/wrap`), return a fully resolved BemJSON tree. No HTML, no
   optimizer. Pure function of a typed tree. This is the bemtree/bemhtml
  template-application phase; the tree it returns is the frozen input to
   phase 2.

2. **`serialize(tree, { document? }): string`** — take a resolved BemJSON
   tree and emit minimal HTML. Only the optimizer's rules run here; every
   tag is final, so `</li>`/`</p>` lookahead is local and simple. Pure
   function of a typed tree.

3. **`render(tree, opts)` = `serialize(renderToBemjson(tree, opts), opts)`**
   — the convenience entry, unchanged signature for callers. `opts.output
   === 'bemjson'` short-circuits after phase 1 and returns the tree
   (the user's requested introspection mode).

This is a real separation of concerns, not a second engine: one template collection,
one matcher, one mode system; the boundary is "templates applied" →
"serialized." Two small pure functions instead of one fused, lookahead-
entangled walk.

### Why not the full bem.info three-stage toolchain

bem.info compiles `bem-xjst` twice (a BEMTREE compiler and a BEMHTML
compiler) with two file types (`.bemtree.js`, `.bemhtml.js`). nuckty does
not need that: there is no second DSL to compile, and the TS-native engine
applies the same mode system in both phases. The win is the **boundary**
(resolved BemJSON as a first-class, inspectable, typed value), not a second
template language. One engine, two phases.

## Summary

| Aspect | bem.info | nuckty recommended | nuckty current |
|---|---|---|---|
| Markdown -> tree | `md-to-bemjson` (remark) | remark/unified → BemJSON (see research-markdown-engine.md) | markdown-it tokens → BemNode |
| Data -> page tree | BEMTREE templates (`.bemtree.js`) | typed layout blocks (block that wraps content) | layout functions (`env.layouts`) |
| Tree -> HTML | BEMHTML templates (`.bemhtml.js`) | `serialize(resolved BemJSON)` | fused `render` (templates + HTML in one walk) |
| Intermediate tree | explicit BemJSON (first-class) | explicit, typed, inspectable BemJSON | none (tree fused with HTML) |
| Template engine | `bem-xjst` compiled twice | one TS engine, two phases | one TS engine, one fused pass |

**Decision: formalize the two-pass boundary in code.** Split `render` into
`renderToBemjson` (template application → resolved typed tree) and `serialize`
(resolved tree → minimal HTML). This gives a first-class, inspectable BemJSON
(the `output: 'bemjson'` mode), decouples the serializer's lookahead from
template application, and aligns nuckty with the typed, remark-based pipeline
bem.info already validated — the best long-term TS fit, evaluated without
regard for the volume of current code.
