# nuckty — templates (nu) spec (1.0.0)

## Purpose

Specify nu, nuckty's single template language: how a block or element becomes HTML through a declarative predicate + mode model, and how the engine applies templates in two typed passes. There is exactly one template engine; Nunjucks and any other engine are not part of nuckty. Markdown content is also produced as BEMTree and rendered by this same engine.

## Requirements

### Requirement: Single BEMJSON template engine
The engine SHALL have exactly one template engine: a BEMJSON → HTML renderer with a declarative predicate + mode authoring model (nu). No `registerTemplateEngine` SHALL exist. Templates SHALL describe ordinary markup structurally through BEMJSON and the `tag` mode. Trusted, already-authored HTML MAY use the explicit `raw` escape hatch; ordinary strings SHALL remain text, not implicit HTML.

#### Scenario: No pluggable template engine
- **WHEN** the engine API is inspected
- **THEN** there is no way to register an alternative template engine
- **AND** ordinary template markup uses structured nodes, while literal HTML requires an explicit trusted `raw` node

### Requirement: block() authoring syntax
A template SHALL be registered by calling `block` with a predicate and a definition inside the default `templates()` export of a `.nu.ts` file. `block('name')(def)` targets a whole block; `block('name').elem('e')(def)` targets an element; `.mod()`/`.elemMod()` narrow further; `.when(pred)` adds an arbitrary predicate. A mode value MAY be a literal or a function `(n, next) => ...`.

#### Scenario: Authoring a block and an element
- **WHEN** a consumer writes `block('menu')({ tag: 'ul' })` and `block('menu').elem('item')({ tag: 'li' })`
- **THEN** `menu` nodes render as `<ul>` and `menu__item` nodes as `<li>`
- **AND** `.when((n) => Boolean(n.props?.submenu))` applies only when the predicate holds

### Requirement: Scoped template collection
Each build SHALL create its own `Templates` collection. The block loader SHALL invoke every default `templates()` export inside an asynchronous scoped context, and `block()` SHALL add declarations to the collection in that context. Calling `block()` outside template loading SHALL fail. Concurrent contexts SHALL remain isolated, including when `nuckty` is loaded through different ESM identities.

#### Scenario: Block module declares templates without env
- **WHEN** `menu.nu.ts` exports `default function templates()` and calls `block('menu')`
- **THEN** the declaration is added to the current build's `Templates`
- **AND** the block module does not receive `NucktyEnv`

#### Scenario: Parallel builds stay isolated
- **WHEN** two asynchronous template contexts declare the same block differently
- **THEN** each `Templates` collection contains only its own declaration

### Requirement: Template module ownership
One `<block>.nu.ts` module SHALL declare templates only for `<block>`. A block with templates SHALL use the default `templates()` export; named `register(env)` exports and top-level `block()` calls SHALL NOT be used.

#### Scenario: One module owns one block
- **WHEN** `blocks/footer/footer.nu.ts` is loaded
- **THEN** every declaration in it starts with `block('footer')`
- **AND** templates for another block live in that block's own directory

### Requirement: Modes split across two passes
All template modes SHALL resolve in the first pass (`renderToBemJson`). Output modes (`tag`, `content`, `attrs`, `cls`, `mods`, `elemMods`, `mix`, `js`, `bem`) SHALL fold into concrete node fields before control modes run. Control selection SHALL prefer `replace`, then `wrap`, then `def`, taking the highest-specificity matching declaration for the selected mode. `replace` and `wrap` SHALL receive the folded node; `def` SHALL receive the original node. Each control's `next()` SHALL yield the folded original. The second pass (`renderToHtml`) SHALL serialize the resolved tree without matching templates or invoking mode functions.

#### Scenario: Structural and output modes run in their pass
- **WHEN** a block declares both a `wrap` and a `tag` mode
- **THEN** the first pass resolves `tag` and passes that folded node to `wrap`
- **AND** the wrapped original retains its resolved tag during the second pass without applying the tag mode again

#### Scenario: Control results preserve every tree position
- **WHEN** `def` returns text, a node, a nested array, `null`, `false`, or `undefined` for one sibling
- **THEN** the replacement is resolved in that position and the other siblings retain their order
- **AND** arrays are flattened and empty positions emit no nodes or HTML

#### Scenario: Control recursion is bounded per branch
- **WHEN** a control for block x produces block y and y produces x
- **THEN** x and y controls each run at most once along that produced branch
- **AND** fresh nodes still receive output modes while already-folded originals returned by `next()` are not folded again
- **AND** independent sibling branches retain their own control application

### Requirement: next() evaluates the fallback chain
An output-mode function SHALL receive a `next` parameter that evaluates the less-specific declaration, ending at the node's own field. An absent own field SHALL yield `undefined`, which the public callback type SHALL represent. A returned value replaces the field; merging SHALL be explicit in the callback, such as spreading `next()` into a new attribute object. There SHALL NOT be a floating `applyNext()`. For control modes, `next()` SHALL yield the already-folded original rather than invoke a lower-priority control; returning that original inside a produced subtree SHALL NOT repeat its output-mode evaluation.

#### Scenario: Attrs merge instead of replacing
- **WHEN** a template declares `attrs: (n, next) => ({ ...next(), 'data-x': '1' })`
- **THEN** the existing attributes are preserved and `data-x` is added
- **AND** omitting the spread of `next()` replaces the attribute set entirely

#### Scenario: Absent values have a typed fallback
- **WHEN** a tag mode has no less-specific declaration and the node has no own tag
- **THEN** `next()` returns `undefined`
- **AND** a callback MAY choose a tag with `next() ?? 'span'`

#### Scenario: Wrapped output mode executes once
- **WHEN** a content mode appends one exclamation mark and wrap includes `next()` as its content
- **THEN** the original text receives one exclamation mark, not two

### Requirement: Specificity ranking
The engine SHALL rank matching declarations by selector-kind weights: named block 1, named element 2, block modifier 4, element modifier 8 and predicate 16. Repeating a kind SHALL NOT add its weight again. `block('*')` SHALL add no block weight, and `elem('*')` SHALL add no element-name weight. At equal specificity, the later registered declaration SHALL win. These rules apply within the active collection; the block loader SHALL load only the last matching `.nu.ts` file across levels. Earlier files require explicit registration to participate in `next()` composition.

#### Scenario: when outranks a block match
- **WHEN** both `block('button')(...)` and `block('button').when(p)(...)` match
- **THEN** the `.when` template wins
- **AND** for two equally specific templates the later declaration wins

#### Scenario: Wildcard conditions retain their weights
- **WHEN** `block('*').when(p)` and a bare named-block declaration both match
- **THEN** the wildcard declaration has predicate weight 16 and outranks the named block's weight 1
- **AND** a bare `block('*')` has weight 0 and yields to a bare named block

### Requirement: Two-pass rendering
The engine SHALL split rendering into two typed passes: `renderToBemJson(tree, { templates }) → BEMTree` applies templates and returns a fully resolved tree without serializing or minifying HTML; `renderToHtml(tree, { document? }) → string` serializes a resolved tree. `render(tree, opts)` SHALL equal their composition, and `output: 'bemjson'` SHALL stop after the first pass. BEMTree SHALL support nodes, strings, recursively nested arrays and empty `null`/`undefined`/`false` positions in both root and child positions. A trusted raw node SHALL retain its explicit HTML payload through both passes.

#### Scenario: Passes are independent
- **WHEN** `renderToBemJson` runs
- **THEN** it returns a tree whose template modes are resolved without serializing it
- **AND** `renderToHtml` serializes that tree without template callbacks
- **AND** `render(tree, { templates, output: 'bemjson' })` returns the tree from pass one

#### Scenario: Resolved fragments serialize directly
- **WHEN** a resolved tree contains nested arrays or tag-false fragments between siblings
- **THEN** serialization preserves their order and block context without inventing wrapper divs
- **AND** empty positions do not throw or generate markup

### Requirement: Refining a modifier replaces its value condition
Selector refinement SHALL replace the condition for that selector kind. A mod or elemMod call without a value SHALL clear an earlier value condition for that kind rather than carry it to the newly selected modifier name. Refinement SHALL preserve the original selector so separately registered branches remain independent.

#### Scenario: Valued selector refines to an unvalued boolean modifier
- **WHEN** a valued block or element modifier selector is refined with a new modifier name and no value
- **THEN** the refined selector matches that new truthy modifier without requiring the old value
- **AND** the original selector still matches its original name and value

### Requirement: Explicit undefined output results clear fields
A selected output-mode callback returning undefined SHALL remove that field from the resolved node. It SHALL NOT retain the source field or a less-specific value unless the callback explicitly returns next(). An omitted mode SHALL still add no setter. This SHALL apply to content, mix and JavaScript data where undefined is a supported value.

#### Scenario: A mode clears source content and client data
- **WHEN** selected content, mix and js callbacks return undefined for a node carrying those source fields
- **THEN** the resolved node carries no retained values for those fields
- **AND** HTML contains neither the source text nor mix classes nor data-bem params
- **AND** the source node and unrelated siblings remain unchanged

### Requirement: Typed output clearing
Public mode callback types SHALL allow undefined results for output field clearing and allow returning next() when no source value is present. Static authoring types SHALL match runtime field removal without casts.

#### Scenario: Typed removal and fallback
- **WHEN** a template callback clears tag or attrs with undefined or returns an absent next value
- **THEN** TypeScript accepts the declaration and runtime omits the resolved field

### Requirement: Wildcard element presence
An elem wildcard selector SHALL match only nodes carrying a nonempty element name. It SHALL NOT match the block root. Its specificity weight SHALL remain unchanged and element-modifier refinement SHALL retain its existing behavior.

#### Scenario: Any element in a block
- **WHEN** menu declares ul and menu.elem wildcard declares li
- **THEN** menu remains ul and its named elements become li

### Requirement: Empty string modifier naming parity

stringifyEntity SHALL retain the modifier value delimiter for empty string values, consistent with classify and mixed entities. Only boolean true SHALL use valueless modifier naming.

#### Scenario: Empty string value

- **WHEN** a block or element modifier has an empty string value
- **THEN** both naming helpers produce the same modifier token including the value delimiter for the configured preset
