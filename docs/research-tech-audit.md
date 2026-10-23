# nuckty — technology and architecture audit

> Historical research from an earlier implementation. The descriptions of the current engine and the proposed migrations below are historical, not the 1.0.0 contract. See the current [nu reference](nu.md) and [documentation review](../../plans/2026-10-05-documentation-review/RESEARCH.md).

> Full audit of every dependency, technology, architectural decision, and
> current implementation. Criterion throughout: **what is the best fit for a
> TypeScript project that will be maintained and developed long-term** —
> alignment with best practices for a TS codebase, ease of long-term support,
> and runtime speed. **The volume of already-written code is explicitly NOT a
> factor.** Sunk cost does not justify a worse future choice. Each
> architectural decision is scored `keep / revisit / drop`.

## Dependencies audit

### autoprefixer — revisit
- Role: PostCSS plugin adding vendor prefixes (`src/stages/css.ts`).
- Best-fit question: is a 4-tool PostCSS chain the right CSS toolchain for a
  TS engine, or should one modern tool replace it?
- Alternatives: **Lightning CSS** (Rust, written in Rust with TS bindings) —
  bundles `@import` inlining + vendor prefixing + minification + nesting in
  one tool, is materially faster, and is the modern best practice. It would
  replace `autoprefixer` + `postcss-import` + `postcss-url` (partially) +
  `csso` in one typed dependency.
- Risks: today's output must match legacy byte-for-byte (CSS hash
  `13ccbcba9c7bbc38`); Lightning CSS output differs and would require a new
  golden reference. That is a one-time re-golden, not an argument against the
  better tool.
- Recommendation: **revisit** — collapse the PostCSS chain to Lightning CSS
  post-1.0.0, re-golden the CSS once.

### basic-ftp — keep
- Role: FTP/FTPS client for `nuckty deploy` (`src/deploy/ftp.ts`): passive,
  TLS via `secureOptions`, recursive LIST, no SSH.
- Best fit: the no-SSH constraint (openspec "Manifest-driven FTP deploy"
  forbids SSH) makes basic-ftp the correct choice — `ssh2-sftp` is out by
  design, `ftp` is stale with no TLS. Pure JS, typed via `@types`... none
  needed (it ships its own types).
- Risks: FTP is fragile; shared hosts cap connections. Retry logic ported.
- Recommendation: **keep.** Correct fit for the no-SSH target hosting.

### csso — revisit (drop with the Lightning CSS collapse)
- Role: CSS minifier (`src/stages/css.ts`).
- Best fit: csso is in maintenance mode; Lightning CSS minify is the modern
  standard and replaces it.
- Recommendation: **revisit → drop** as part of the Lightning CSS collapse
  (see autoprefixer). Re-golden CSS once.

### esbuild — keep
- Role: JS bundler/minifier (`src/stages/js.ts`): IIFE, es2018, minify,
  content-hash.
- Best fit: esbuild is the modern, fast, maintained JS bundler; its minify
  output is well-defined. Alternatives (terser, swc, Rollup+terser) offer no
  advantage and worse-fitting output. esbuild ships native TS types.
- Risks: the JS output is the golden reference; changing the minifier breaks
  byte-for-byte — a re-golden, not an argument.
- Recommendation: **keep.**

### js-yaml — revisit (likely drop)
- Role: listed for YAML parsing, but `config/sitemap.yml` is NOT parsed by
  js-yaml — it has a custom indent-stack parser
  (`src/stages/sitemap.ts:89-139`, `parseIndentedSitemap`).
- Best fit: a dependency that the core path does not use is dead weight.
- Risks: sitemap uses a custom parser; confirm whether js-yaml is imported
  anywhere (site-config loads JSON, not YAML).
- Recommendation: **revisit → drop** if no real consumer; if a YAML consumer
  exists, keep. Verify by grep before removing.

### markdown-it — revisit → migrate to remark/unified
- Role: Markdown → token stream → (hand-rolled) BemNode bridge
  (`src/markdown/index.ts:96-222`).
- Best fit for a TS engine: **not the best.** markdown-it 14.3.0 ships NO
  built-in types (verified: no `types`/`typings` field, no `.d.ts`); types
  come from `@types/markdown-it` (DefinitelyTyped), a third-party layer that
  can drift. Its extension model is a flat token stream + `renderer.rules`
  overrides — nuckty replays open/close tokens into a tree by hand, which is
  the fragile, stateful, hard-to-type code you least want to maintain.
  remark/unified (micromark + mdast + hast) is TS-native with a typed, spec'd
  AST, and the BemNode bridge becomes a clean typed tree→tree transform.
- Full reasoning: `docs/research-markdown-engine.md`.
- Recommendation: **revisit → migrate to remark/unified.** The best long-term
  TS fit. Existing bridge code is sunk cost, not a reason to stay.

### markdown-it-video — revisit (move out of engine deps)
- Role: embed videos in markdown.
- Best fit: a content feature in the engine dependency list, in tension with
  openspec "engine ships zero content features." It belongs in a consumer
  plugin, and as a remark plugin once the engine migrates (see research-markdown-engine.md).
- Recommendation: **revisit** — relocate to a consumer plugin.

### postcss + postcss-import + postcss-url — revisit (collapse to Lightning CSS)
- Role: CSS pipeline — `@import` inlining, `url()` rewrite via image-mapping,
  prefixing, minify (`src/stages/css.ts`).
- Best fit: four tools for one CSS file is more than the modern standard
  needs. Lightning CSS replaces import + prefix + minify; `url()` rewrite is
  the one piece Lightning CSS does not own (it's an image-mapping concern).
- Recommendation: **revisit** — collapse to Lightning CSS + a small `url()`
  rewrite step. Re-golden CSS once.

### terser — drop
- Role: listed in dependencies but `src/stages/js.ts` uses esbuild only
  (PROGRESS 2026-07-13: legacy never used terser despite the dep).
- Best fit: a dead dependency is never the best fit.
- Recommendation: **drop.** (See Bugs & risks.)

### tobii — revisit (move out of engine deps)
- Role: lightbox JS library bundled for galleries.
- Best fit: a front-end asset in engine deps — same tension as
  markdown-it-video; content/frontend features should be consumer plugins,
  not engine dependencies.
- Recommendation: **revisit** — relocate to a consumer plugin.

### vnu-jar — keep
- Role: Nu Html Checker, run as HTTP daemon by `VnuHttpValidator`
  (`src/validate/validator.ts`).
- Best fit: the only validator that accepts nuckty's optional-tag-omission
  HTML5 model (superhtml rejects it). The JVM cost is real but mitigated by a
  persistent daemon + content-hash cache. No better-typed alternative exists
  for real W3C conformance.
- Risks: `java` must be on PATH; 3-7s cold start (daemon mitigates).
- Recommendation: **keep.** The price of real validation.

### devDependencies
- `@types/js-yaml`, `@types/markdown-it`, `@types/node` — keep; type shims.
  `@types/markdown-it` goes away with the remark migration (native types).
  `@types/node` required explicitly (tsconfig `"types": ["node"]`; TS 7 does
  not auto-resolve it, PROGRESS 2026-07-13).
- `tsup` — keep (JS bundler); `dts: false` because rollup-plugin-dts is
  incompatible with TS 7 (`config/config-tsup.ts:3-6`); types via tsc.
- `tsx` — keep; runs `.ts` tests directly (`npm test` = `tsx --test`).
- `typescript` (^7.0.2) — keep; native Go port, tsc ~0.2s.

## Technology stack

### Node >= 20 — keep
- `engines.node`. ESM, `node:zlib`, `node:test`, `node:child_process`,
  `node:crypto` (MD5), `node:fs/promises`. All stable in Node 20+.
- Recommendation: **keep.**

### ESM-only (`"type":"module"`) — keep
- All `.js` imports carry extensions (TS `verbatimModuleSyntax`, NodeNext).
- Best fit: a build-time CLI has no CJS obligation. Dual CJS/ESM is needless
  complexity.
- Recommendation: **keep.**

### TypeScript 7 (Go port) + tsc/tsup split — keep
- tsc emits `.d.ts` (`config/config-ts-types.json`); tsup emits JS
  (`dts: false`). rollup-plugin-dts is incompatible with TS 7.
- Best fit: tsc ~0.2s is a real win; the dts split is a pragmatic, typed
  workaround. TS 7 is the right modern baseline; rollup-plugin-dts lagging
  is an ecosystem catch-up, not a flaw in the choice.
- Risks: two build tools; ecosystem tools lag TS 7.
- Recommendation: **keep.**

### node:test (not ava) — keep
- `npm test` = `tsx --test src/test/**/*.test.ts`. Silent on success.
- Best fit: zero-dep, built-in runner fits "silent on success" and keeps the
  dependency surface small. vitest is richer but adds a dependency for
  asserts nuckty does not need.
- Recommendation: **keep.**

### PostCSS chain (4 tools) — revisit (collapse to Lightning CSS)
- See Dependencies. Modern best practice is one Rust-based tool; the 4-tool
  chain is a legacy carry-over. Re-golden CSS once.
- Recommendation: **revisit.**

### esbuild (JS bundle) — keep
- IIFE, es2018, minify. The JS output is the golden reference. esbuild is the
  modern standard JS bundler.
- Recommendation: **keep.**

### node:zlib (Brotli Q11 + Gzip 9, no zstd) — keep
- `src/stages/compression.ts`. Brotli Q11, Gzip 9, gzip OS byte 0xFF for
  cross-platform determinism (openspec "Pre-compressed deployable artifact").
  **No zstd** — correctly dropped: 0 `.zst` in ~/site output, always loses to
  br11, build-time shared dict impossible (browsers can't decode custom-dict
  .br), CDT (RFC 9841) needs dynamic negotiation breaking the static-map
  model (PROGRESS 2026-07-14).
- Recommendation: **keep.** The zstd rejection is sound.

### basic-ftp — keep (see deps)
### vnu.jar + JVM — keep (see deps)
### js-yaml — revisit → drop (see deps)

## Architectural decisions

### 1. BEMJSON data model (not template strings) — keep
- Choice: BemNode tree → HTML. `src/bem/types.ts`, `src/bem/render.ts`.
- Best fit: a typed tree is the right model for a TS engine — escaping and
  minimization are the engine's job, blocks are redefinable, one renderer
  for content and layout. String templates (Nunjucks, legacy) are strictly
  worse for a typed codebase; JSX drags a React runtime. BEMJSON is the
  correct, typeable choice.
- Recommendation: **keep.** Core differentiator.

### 2. Single fused render pass (templates + HTML in one walk) — revisit → split
- Choice: `render` applies templates and emits HTML in one walk
  (`src/bem/render.ts`); template application and the serializer's lookahead
  are coupled (`shouldEmitClose` needs the next sibling's FINAL tag).
- Best fit for long-term TS support: **a fused pass is not the best fit.**
  It makes the BemJSON tree a non-first-class value (no `output: 'bemjson'`
  introspection), and couples the optimizer's lookahead to template
  application — the hardest, most bug-prone part of the renderer. The better
  shape is two typed phases: `renderToBemjson` (templates → resolved typed
  tree) + `serialize` (resolved tree → minimal HTML). This gives a
  first-class inspectable BemJSON, a pure, decoupled serializer, and aligns
  with the remark-based, typed pipeline bem.info already validated.
- Full reasoning: `docs/research-two-pass.md`.
- Recommendation: **revisit → split** the render into two typed phases.

### 3. BemNode type (props/raw) — keep
- `props`: template data never reaching HTML. `raw`: trusted pass-through.
- Best fit: both fields are necessary — `props` is the typed data channel,
  `raw` the escape hatch. `raw` is dangerous if fed untrusted input; document
  it as trusted-only.
- Recommendation: **keep.**

### 4. classicPreset naming (block__elem_mod_val) — keep
- One preset, classic BEM (`src/bem/naming.ts`).
- Best fit: BEM classic is the standard, well-understood naming. The
  `NamingPreset` type already parameterises delimiters for future presets
  without adding them now.
- Recommendation: **keep.**

### 5. 30-rule HTML minimization — keep
- `src/bem/html/escape.ts` (`needsQuotes` — comma does not force quotes),
  `src/bem/render.ts` (two-pass lookahead). Omit optional tags, unquote
  attrs, void without `/>` (except SVG children), zero inter-element
  whitespace, comments stripped, `\n\n` EOF, `raw` pass-through.
- Best fit: hand-authored minimization over a typed tree is correct here —
  html-minifier-terser is a regex post-processor that fights the tree model,
  and superhtml rejects the optional-tag omission the output relies on. The
  rules are validated against real vnu.
- Note: after the render split (#2), the lookahead moves into `serialize`
  where it is local and simple (all tags are final). The rules themselves
  are unchanged.
- Recommendation: **keep.**

### 6. One render mode (dev === prod) — keep
- No separate dev markup (openspec "One render mode").
- Best fit: one mode is simpler to maintain and removes a whole class of
  "works in dev, breaks in prod" bugs. Debug-ability is served by the
  `output: 'bemjson'` introspection mode (after #2), not by pretty HTML.
- Recommendation: **keep.**

### 7. Plugin-only extension — revisit (collapse layout into block)
- Choice: `plugins: ['./blocks/.../*.nu.ts']`; loader strictly enforces
  `.nu.ts` (`src/env/loader.ts:67`). `NucktyEnv.registerBlock /
  registerMarkdownPlugin / registerLayout` (`src/env/env.ts`).
- Best fit: plugin-only is right, BUT **`registerLayout` is a separate
  category that violates BEM's "everything is a block"** — it plies an extra
  entity. A layout is a block that wraps page content
  (`block('root')({ content: ... })`), not a function in a separate
  `layouts` Map. Keeping layouts as a distinct API is not the best fit; it
  adds a parallel concept the engine then has to maintain and document.
- Recommendation: **revisit → collapse** `registerLayout` into `registerBlock`.
  A layout is a block. Removes an entity, honors the BEM principle the
  engine claims. (Also resolves the user's `page` vs `root` naming point: the
  `<html>`-emitting block is `root`, an ordinary block.)

### 8. `.nu.ts` contract — keep
- Loader rejects non-`.nu.ts` plugin paths (`src/env/loader.ts:67`).
- Best fit: a template-file extension (like `.njk`/`.hbs`/`.astro`) is a
  clear, enforceable contract; TS/FS see it as `.ts` with basename `*.nu`, no
  config change needed.
- Recommendation: **keep.**

### 9. Pre-compression Brotli Q11 + Gzip 9 (no zstd) — keep
- See Technology stack. zstd correctly rejected.
- Recommendation: **keep.**

### 10. gzip OS byte 0xFF determinism — keep
- Normalizes gzip byte 9 to 0xFF for cross-platform byte-for-byte builds
  (`src/stages/compression.ts`). Required for manifest hash stability.
- Recommendation: **keep.**

### 11. Image one-URL negotiation (no `<picture>`) — keep
- AVIF→WebP→PNG→JPG→SVG from one URL by `Accept`, via host config (nginx
  `try_files` / Apache RewriteCond). No `<picture>`/`<source>`, no CDN.
- Best fit: bakes negotiation into the host, keeps HTML minimal, serves the
  best format. The host-config complexity is the right place to put it.
- Recommendation: **keep.**

### 12. Manifest-driven FTP deploy — keep (revisit missing-repos)
- `manifest.json` (MD5 16-hex + size; partial 1KB hash for zip/pdf), diff vs
  remote, upload only changed, delete vanished, MFMT mtime, safety-abort
  >30%, passive/TLS, no SSH (`src/deploy/ftp.ts`).
- Best fit: manifest-diff over plain FTP is the correct model for the
  no-SSH target hosting. rsync/git/S3 are out by the hosting-class constraint.
- Open: missing-repos preserve NOT ported (files from missing external repos
  deleted as orphans; blocks on stats files).
- Recommendation: **keep; revisit** missing-repos preserve.

### 13. vnu HTTP daemon + content-hash cache — keep
- Persistent vnu.jar on :8888, lazy, parallel POST, content-hash cache
  (`src/validate/validator.ts`).
- Best fit: the only real-W3C validator; the JVM cost is mitigated by the
  daemon + cache. No better-typed alternative.
- Recommendation: **keep.**

### 14. Multi-target + cross-target hreflang — keep
- `config-nuckty.ts` targets (configDir/outDir/lang/host/group);
  `resolveAlternates` by group feeds `alternates` to render context; engine
  gives data, consumer's head block emits `<link rel=alternate hreflang>`
  (`src/stages/html.ts:87-95`, `src/targets/config.ts`).
- Best fit: engine-emits-data-not-tags is the right separation — the engine
  does not hardcode SEO markup; the consumer does.
- Recommendation: **keep.**

### 15. Programmatic pipeline (phases + stages + before/after hooks) — keep
- `Pipeline` with phases `clean|prepare|render|optimize|emit`,
  `registerStage`, `before`/`after` (`src/pipeline/pipeline.ts`,
  `src/stages/index.ts`). Nothing hard-wired beyond `nuckty build`.
- Best fit: a code-driven, fully replaceable pipeline is the right
  abstraction for an extensible engine — typed stages and hooks, no
  declarative config to outgrow.
- Recommendation: **keep.**

### 16. nginx.conf + .htaccess programmatic generation — keep
- `src/stages/nginx.ts` (generateNginxConfig), `src/stages/htaccess.ts`
  (generateHtaccess) — pure string builders, no Nunjucks. nginx.conf →
  ctx.buildDir (serve.ts reads it), .htaccess → ctx.outDir (Apache deploy).
- Best fit: generating both host configs from data is the right model —
  the engine owns the serving strategy for the pre-compressed artifact. The
  two-host strategy (nginx local + Apache shared) is a real differentiator.
- Open: consumer-specific redirects not in the generator (add via
  after-hook); document the gap.
- Recommendation: **keep; document** the redirects gap.

### 17. sitemap.yml explicit tree — keep
- See `docs/research-sitemap-vs-routes.md`. Single file, recursive
  URL-by-nesting, layout fallback, breadcrumbs, md2url link resolution.
  Wins for documentation sites; the "weaknesses" are deliberate features
  (gatekeeper = intentional pages, sitemap = single source of truth,
  layout centralized = site-level concern).
- Recommendation: **keep** for the target class (docs).

### 18. No post-render HTML transformation — keep
- All link/anchor/image work in the markdown pass; renderer output never
  regex-patched. A discipline, not a flag.
- Recommendation: **keep.**

### 19. GitHub-native .md links + hierarchical anchors + cycle detection + lazy forward refs — keep (revisit cross-doc lazy)
- Authors write `[x](../free/tyres.md#раздел)`; engine resolves via sitemap,
  rewrites anchors to compound `top-mid-leaf` ids, fails on cycles
  (`src/markdown/anchors.ts`, `slugify.ts`, sitemap md2url).
- Best fit: GitHub-native authoring + build-time resolution is the right
  UX; no `ref`/`relref` tax. Cross-doc lazy anchor resolution NOT ported
  (relied on HTML strings); revisit if cross-doc anchor edges need it.
- Recommendation: **keep; revisit** cross-doc lazy resolution.

### 20. Engine daemons lifecycle (serve/stop) — revisit (bug)
- `nuckty serve` spawns nginx with the generated config; `nuckty stop` kills
  daemons (`src/serve.ts`).
- Bug: `pkill -KILL -f nginx` (src/serve.ts:91) kills ALL nginx on the
  machine, not only nuckty's. On a dev box with another nginx, destructive.
- Recommendation: **revisit** — track the spawned PID, kill only it.

## Implementation status

### Fully implemented
- `nuckty build [target]`, `serve [target] --port`, `stop`, `deploy [target]
  --force --dry-run`, `validate [target]` (validate wired,
  `src/build.ts:60-61`).
- nginx.conf generation (`src/stages/nginx.ts`), .htaccess generation
  (`src/stages/htaccess.ts`), both registered (`src/stages/index.ts:91-113`).
- pre-compression br11/gz9 + gzip OS byte 0xFF (`src/stages/compression.ts`).
- image one-URL negotiation, sitemap tree, link integrity, one renderer,
  minimal HTML (30 rules), image-mapping.json shared by md+CSS, no
  post-render, programmatic pipeline, multi-target, hreflang, plugins, FTP
  manifest.
- Tests 187/187 green, tsc green, build green (after htaccess + validate).

### Partial / not ported (flagged in PROGRESS)
- **missing-repos preserve** — NOT ported. Orphan-deletes files from missing
  external repos (PROGRESS 2026-07-14). Blocks on stats/build-assets-meta.
- **stats collector** — build-*.json reports NOT written (PROGRESS 2026-07-13).
  Restore when reports needed.
- **cross-doc lazy anchor resolution** — NOT ported (relied on HTML strings;
  anchors already hierarchical per-page; PROGRESS 2026-07-13).
- **git-mtime propagation** — partial. `src/utils/timestamp.ts` (per-page
  lastUpdated) exists; dependency-aware output-file mtime stamping NOT ported
  (PROGRESS 2026-07-13).
- **`nuckty setup`** — stub (`src/build.ts:63-64`). Not part of 1.0.0 contract.
- **A3 spec leftovers** — `openspec/specs/core/spec.md:139` still says "zstd >
  brotli > gzip"; Host serving requirement still says "copy" .htaccess while
  it is generated. Cleanup pending.

### Open design items (decisions made in this audit)
- **Migrate markdown-it → remark/unified** (`docs/research-markdown-engine.md`):
  native TS types, typed mdast AST, clean tree→tree BemNode transform.
- **Split the render pass** (`docs/research-two-pass.md`):
  `renderToBemjson` (templates → resolved typed tree) + `serialize`
  (resolved tree → minimal HTML); gives the `output: 'bemjson'`
  introspection mode and a decoupled serializer.
- **Collapse `registerLayout` into `registerBlock`** (#7): a layout is a
  block. Removes the separate `layouts` Map and `registerLayout` API; the
  `<html>`-emitting block is `root`, an ordinary block.
- **Collapse the PostCSS chain to Lightning CSS** (autoprefixer/csso/
  postcss-import/postcss-url → Lightning CSS + url() rewrite); re-golden CSS.
- **Drop terser** (unused), **drop js-yaml** if unused (verify by grep), move
  markdown-it-video + tobii to consumer plugins.

## Bugs & risks found

1. **`pkill -KILL -f nginx` kills ALL nginx** — `src/serve.ts:91` (`stop()`).
   On a machine running another nginx, `nuckty stop` kills it. Fix: track the
   spawned nginx PID in `serve()` and kill only that PID; document the risk.
   Severity: high on dev machines.

2. **`terser` is an unused dependency** — `src/stages/js.ts` uses esbuild only
   (PROGRESS 2026-07-13 confirmed legacy never used terser). Drop it.
   Severity: low (dead weight, misleading).

3. **`js-yaml` likely unused** — sitemap has a custom indent-stack parser
   (`parseIndentedSitemap`), not js-yaml. Verify whether js-yaml is imported
   anywhere; if not, drop. Severity: low.

4. **`registerLayout` plies entities** — `src/env/env.ts:53` keeps a separate
   `layouts` Map and `registerLayout`; `src/stages/html.ts:58-61` treats
   layouts as functions. In BEM a layout is a block. The separate category is
   an extra entity the engine then must maintain and document. Severity:
   design (not runtime), contradicts "everything is a block". Fixed by #7.

5. **Consumer-specific redirects not in .htaccess generator** —
   `generateHtaccess` produces technical negotiation/cache config but no user
   redirects (the ~/site .htaccess has ~30 `Redirect 301` lines). Consumers
   add redirects via an after-hook. Documented gap; acceptable for 1.0.0,
   must be documented.

6. **spec.md stale leftovers** — `spec.md:139` still mentions zstd priority;
  the Host serving requirement says "copy" .htaccess while it is generated.
   Cleanup pending (A3).

7. **markdown-it-video and tobii in engine deps** — content/front-end
   features in the engine dependency list, in tension with "engine ships zero
   content features" (openspec). Should be consumer plugins. Severity: design.
