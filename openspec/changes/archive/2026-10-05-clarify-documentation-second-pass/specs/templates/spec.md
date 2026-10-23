## MODIFIED Requirements

### Requirement: block() authoring syntax
A template SHALL be registered by calling `block` with a predicate and a definition inside the default `templates()` export of a `.nu.ts` file. `block('name')(def)` targets a whole block; `block('name').elem('e')(def)` targets an element; `.mod()`/`.elemMod()` narrow further; `.when(pred)` adds an arbitrary predicate. A mode value MAY be a literal or a function `(n, next) => ...`.

#### Scenario: Authoring a block and an element
- **WHEN** a consumer writes `block('menu')({ tag: 'ul' })` and
  `block('menu').elem('item')({ tag: 'li' })`
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

### Requirement: Specificity ranking
The engine SHALL rank matching declarations by selector-kind weights: named block 1, element 2, block modifier 4, element modifier 8 and predicate 16. Repeating a kind SHALL NOT add its weight again. `block('*')` SHALL add no block weight. At equal specificity, the later registered declaration SHALL win. These rules apply within the active collection; the block loader SHALL load only the last matching `.nu.ts` file across levels. Earlier files require explicit registration to participate in `next()` composition.

#### Scenario: when outranks a block match
- **WHEN** both `block('button')(...)` and `block('button').when(p)(...)` match
- **THEN** the `.when` template wins
- **AND** for two equally specific templates the later declaration wins

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
