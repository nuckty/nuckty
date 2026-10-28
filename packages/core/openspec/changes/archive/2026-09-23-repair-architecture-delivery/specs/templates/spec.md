## MODIFIED Requirements

### Requirement: Single BEMJSON template engine
The engine SHALL have exactly one template engine: a BEMJSON → HTML renderer with a declarative predicate + mode authoring model (nu). No `registerTemplateEngine` SHALL exist. Templates SHALL describe ordinary markup structurally through BEMJSON and the `tag` mode. Trusted, already-authored HTML MAY use the explicit `raw` escape hatch; ordinary strings SHALL remain text, not implicit HTML.

#### Scenario: No pluggable template engine
- **WHEN** the engine API is inspected
- **THEN** there is no way to register an alternative template engine
- **AND** ordinary template markup uses structured nodes, while literal HTML requires an explicit trusted `raw` node

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

### Requirement: next() merges toward the node
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

### Requirement: Two-pass rendering
The engine SHALL split rendering into two typed passes: `renderToBemJson(tree, { templates }) → BEMTree` applies templates and returns a fully resolved tree without serializing or minifying HTML; `renderToHtml(tree, { document? }) → string` serializes a resolved tree. `render(tree, opts)` SHALL equal their composition, and `output: 'bemjson'` SHALL stop after the first pass. BEMTree SHALL support nodes, strings, recursively nested arrays and empty `null`/`undefined`/`false` positions in both root and child positions. A trusted raw node SHALL retain its explicit HTML payload through both passes.

#### Scenario: Passes are independent
- **WHEN** `renderToBemJson` runs
- **THEN** it returns a tree whose template modes are resolved without serializing it
- **AND** `renderToHtml` serializes that tree without template callbacks
- **AND** `render(tree, { output: 'bemjson' })` returns the tree from pass one

#### Scenario: Resolved fragments serialize directly
- **WHEN** a resolved tree contains nested arrays or tag-false fragments between siblings
- **THEN** serialization preserves their order and block context without inventing wrapper divs
- **AND** empty positions do not throw or generate markup
