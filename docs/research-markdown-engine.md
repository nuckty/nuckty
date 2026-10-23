# Markdown Engine Audit: markdown-it vs remark/unified vs marked

> Historical research from an earlier implementation. The descriptions of the current engine and the proposed migrations below are historical, not the 1.0.0 contract. See the current [nu reference](nu.md) and [documentation review](../../plans/2026-10-05-documentation-review/RESEARCH.md).

> Decide which Markdown engine is the best fit for a TypeScript project that
> will be maintained and developed long-term. Evaluation criteria: alignment
> with best practices for a TS codebase, ease of long-term support/maintenance,
> and runtime speed. **The volume of already-written nuckty code is explicitly
> NOT a factor** — sunk cost does not justify a worse future choice. We pick
> the engine that is best to live with for years.

## TL;DR

**Migrate to remark/unified (micromark under the hood).** For a TypeScript-first
project, the unified ecosystem is the better long-term foundation: native TS
types (no `@types/*`), a typed AST (mdast/hast) that maps cleanly to a BemNode
tree, a stable plugin contract, and the fastest parser core (micromark).
markdown-it is a fine parser, but it is a JavaScript-first library whose types
ship via DefinitelyTyped (`@types/markdown-it`), and its extension model is a
flat token-stream + `renderer.rules` overrides — less structured than an AST
you can type and transform. nuckty's goal is a typed, maintainable engine; the
right engine for that goal is the typed-AST one. The existing ~500-line
markdown-it bridge is not a reason to stay — it is a reason to rewrite it once,
well, onto the better base.

## Evaluation criteria (what matters)

1. **TypeScript fit** — native types, typed extension surface, no `@types/*`
   layer of indirection that can drift from the JS release.
2. **Long-term maintainability** — stability of the API contract, clarity of
   the extension model, ability to type-check plugin code, active maintenance.
3. **Runtime speed** — parse + transform throughput for hundreds-to-thousands
   of docs pages.
4. **Extension model quality** — how cleanly custom output (here: BemNode,
   not HTML) plugs in. This is nuckty's central requirement: the engine must
   emit a BemNode tree, not HTML.

The amount of code already written against markdown-it is deliberately
excluded. We are choosing the engine for the next years, not defending past
work.

## Candidate 1: markdown-it (current)

**What it is.** CommonMark + GFM parser. JS core; a flat token stream
(`Token[]`) consumed by `renderer.rules`, each rule overridable to produce HTML.

**TypeScript fit.** **JS-first, types via DefinitelyTyped.** Verified against
the installed copy (markdown-it 14.3.0): the package has no `types`/`typings`
field and ships no `.d.ts` files; types come from `@types/markdown-it`
(DefinitelyTyped). That is a layer of indirection: type correctness lags the
JS release, and the type surface is maintained by a third party. For a TS-first
engine, depending on a JS library whose types are externally curated is a
weaker position than depending on a TS-native library whose types are the
source of truth.

**Maintainability.** Mature and widely used (~50M/wk). The `renderer.rules`
override model is flexible but untyped at the edges — rules receive `Token`
objects and return strings; there is no typed AST to transform. Plugins are
`(md) => void` side-effecting functions. Contract is stable but not expressed
in types.

**Speed.** Fast in practice; not the bottleneck for a docs SSG. micromark is
faster on raw parse, but markdown-it is adequate.

**Extension model for BemNode.** nuckty walks the flat token stream and emits
BemNode inline (`tokensToBem`). There is no tree to transform — you replay
open/close token pairs into a tree by hand. This works but it is manual,
stateful (a position cursor, an `insideListItem` flag, lookback slices), and
hard to type tightly. The bridge is the kind of code that is easy to get
subtly wrong on edge cases (list-item paragraph wrapping, inline slices) —
which is exactly the code you do NOT want to maintain long-term against an
untyped token stream.

**Verdict.** Adequate, but not the best TS fit. JS-first library + external
types + flat token stream + hand-rolled tree reconstruction. For a project
betting on TypeScript, this is the weakest of the three on the criteria that
matter here.

## Candidate 2: remark / unified / micromark (recommended)

**What it is.** micromark (parser, event-stream-based, fastest CommonMark) →
mdast (typed Markdown AST, via `remark-parse`) → unified (transform pipeline)
→ hast (typed HTML AST, via `remark-rehype`). `remark` is the mdast-facing
processor; `unified` is the glue.

**TypeScript fit.** **Native, first-class.** The whole ecosystem is authored
in TypeScript; mdast and hast are defined as typed node interfaces (e.g.
`Heading`, `Paragraph`, `Code`, `Table`, `Link`, `Image`, with typed
`children`). Plugin contracts are typed (`Plugin<Settings, Input, Output>`).
No `@types/*`. This is the decisive difference for a TS engine: the structure
you transform IS the typed data, not an after-the-fact wrapper.

**Maintainability.** Active, well-governed (remarkjs), coherent architecture
(parser → AST → serializer), versioned specifications for mdast/hast (so the
AST shape is a stable contract, not an implementation detail). Plugins compose
through the unified pipeline. This is the most maintainable shape: a typed
AST with a spec'd contract.

**Speed.** micromark is the fastest CommonMark parser in the ecosystem. AST
transformation adds overhead vs. a flat token stream, but for a docs SSG the
delta is negligible and the win is maintainability.

**Extension model for BemNode.** **This is where unified wins cleanly.**
Instead of replaying open/close token pairs into a tree by hand, nuckty writes
a typed mdast→BemNode transformer: a recursive visitor over typed mdast nodes
(`heading`, `list`, `code`, `table`, `link`, `image`, `strong`, `em`). Each
node is self-contained with typed `children`; there is no open/close pairing,
no position cursor, no `insideListItem` flag, no lookback slicing. The
transform is a pure function over a typed tree — far easier to get right, to
type tightly, and to maintain. Heading-anchor logic, `.md`-to-URL resolution,
and image-mapping rewrite become typed mdast transforms instead of positional
token hacks.

**Verdict.** The best fit for a TypeScript-first, long-term-maintained engine.
Typed AST, native types, spec'd node contract, fastest parser core, and a
BemNode bridge that is a clean tree-to-tree transform instead of a hand-rolled
token replayer.

## Candidate 3: marked

**What it is.** Fast, low-level Markdown-to-HTML compiler. Renderer
overrides exist but the plugin model is thinner and less structured than
markdown-it's.

**TypeScript fit.** JS-first; types via `@types/marked`. Same indirection
problem as markdown-it, with a weaker extension surface.

**Maintainability.** Maintained, but a smaller, less coherent ecosystem than
unified. No typed AST contract.

**Speed.** Fast on parse; competitive.

**Extension model for BemNode.** Like markdown-it, you bypass HTML output and
rebuild a tree from tokens. Same hand-rolled problem, worse plugin model.

**Verdict.** Dominated by both alternatives: markdown-it has a richer
extension model, unified has types + a typed AST. No reason to choose marked.

## Comparison

| Criterion | markdown-it (current) | remark/unified (recommended) | marked |
|---|---|---|---|
| TypeScript types | external (`@types/markdown-it`) | native, first-class | external (`@types/marked`) |
| Data model | flat token stream | typed AST (mdast/hast), spec'd | token stream |
| BemNode bridge | hand-rolled token→tree replay | typed mdast→BemNode visitor | token replay |
| Maintenance shape | positional, stateful | pure tree transform | positional |
| Parser speed | adequate | fastest (micromark) | fast |
| Plugin contract | `(md)=>void` side-effect | typed `Plugin<S,In,Out>` | `(md)=>void` |
| Ecosystem coherence | flat rules | parser→AST→serializer pipeline | flat rules |

## Decision

**Adopt remark/unified (micromark + remark-parse + unified), and write a
typed mdast→BemNode transformer.** Reasons, in priority order:

1. **Best TypeScript fit.** Native types, a typed AST, and a typed plugin
   contract — no `@types/*` layer that can drift from the JS release. This is
   the core of "a TypeScript project": depend on libraries that are
   TypeScript-native, not JS libraries wrapped by third-party types.
2. **Best long-term maintainability.** mdast/hast are versioned specs; the AST
   shape is a contract, not an implementation detail. A typed tree transform
   is easier to reason about, type-check, and extend than a positional token
   replayer. The bridge code that is most bug-prone today (list-item
   paragraph wrapping, inline slicing, heading anchors) becomes ordinary
   recursive visitor code over typed nodes.
3. **Best extension model for BemNode.** nuckty's central need is emitting a
   BemNode tree, not HTML. unified's typed-AST pipeline is literally built
   for "transform tree A into tree B"; markdown-it's token stream is built
   for "produce HTML". The fit is better by construction.
4. **Speed is not sacrificed.** micromark is the fastest CommonMark parser in
   the ecosystem. Any AST overhead is negligible against I/O and the nu
   renderer for a docs SSG.

**markdown-it stays only if** a hard constraint forces it (e.g. a specific
markdown-it plugin with no remark equivalent that nuckty cannot do without).
The known plugins (markdown-it-video, gallery/grid/partner-link, tobii
lightbox) are content features that, per openspec "Plugins are the only
extension mechanism", belong in consumer plugins anyway — they should not
anchor the engine's core parser choice. Each can be reimplemented as a
remark plugin (or a custom mdast transform) without loss.

**marked is rejected** — dominated on every criterion that matters here.

## Migration note (scope, not a reason to defer)

Rewriting the bridge is a one-time, bounded effort: a typed mdast→BemNode
visitor replacing `tokensToBem`/`inlineToBem`, plus mdast versions of the
heading-anchor, link-resolution, and image-mapping logic (the Russian
typography pre-pass is source-text level and parser-agnostic — it survives
unchanged). This is work, but it is work that replaces fragile positional
code with typed tree code — i.e. it pays down debt, not incurs it. The cost
of the rewrite is not an argument against the better engine; it is the
price of the better foundation.

