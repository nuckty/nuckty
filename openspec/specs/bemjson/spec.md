# nuckty — bemjson spec (1.0.0)

## Purpose

Specify the shared BEMJSON data model for content and document layout. `BemNode` describes one node; `BEMTree` also includes text, recursively nested arrays and empty positions. Both content and layout use the same renderer. Structural fields are JSON-like; arbitrary `props` values may require caller-owned serialization.

## Requirements

### Requirement: BEMTree node fields
The node type SHALL be `BemNode`, with optional typed fields `block`, `elem`, `mods`, `elemMods`, `mix`, `content`, `tag`, `attrs`, `cls`, `js`, `bem`, `props` and `raw`. `BEMTree` SHALL include a node, text, recursively nested arrays and empty `null`/`undefined`/`false` positions.

#### Scenario: A node carries typed fields
- **WHEN** TypeScript type-checks a node explicitly typed as BemNode
- **THEN** the compiler checks each field against `BemNode`
- **AND** the build loader itself only transpiles TypeScript and does not replace that check

### Requirement: BEMTree field semantics
The fields SHALL carry these semantics: `block`/`elem` name the BEM entity; `mods`/`elemMods` are modifier maps; `content` is a recursive `BEMTree`; `tag` is an HTML tag or `false` (emit content without a wrapper); `attrs` is the HTML attribute map; `cls` supplies an extra non-BEM class; `js` carries client JavaScript data; `bem` toggles BEM class generation (default true).

#### Scenario: tag false emits content only
- **WHEN** a node carries `tag: false`
- **THEN** its content is emitted without a tag

### Requirement: props data and explicit template output
`props` SHALL carry data for templates and SHALL NOT be serialized automatically. A template MAY read `n.props` and expose its values through content or attributes. The field SHALL NOT be described as a secrecy boundary. Its values MAY include non-JSON objects such as `Map`; callers own any serialization of those values.

#### Scenario: props is not serialized automatically
- **WHEN** a node has `props: { type: 'submit' }` and no attr derived from it
- **THEN** the rendered HTML contains no trace of `props`
- **AND** a template may read `n.props.type` to compute an attribute

### Requirement: raw is a trusted verbatim string
`raw` SHALL be emitted verbatim: not escaped, not minimized. It is the escape hatch for trusted strings — ready HTML, inline analytics scripts, SVG. Untrusted input SHALL NOT be placed in `raw`; the engine emits it without processing.

#### Scenario: raw passes through unmodified
- **WHEN** a node has `raw: '<svg>...</svg>'`
- **THEN** the exact string appears in output, unescaped and unminimized

### Requirement: Tree is a first-class value
The render entry point SHALL support `output: 'bemjson'`, returning the resolved `BEMTree` without HTML serialization. The result MAY be text, an array or an empty position rather than an object. Logging, comparison, caching or persistence SHALL account for non-JSON values in `props`.

#### Scenario: Get the tree instead of HTML
- **WHEN** `render(page, { templates, output: 'bemjson' })` is called
- **THEN** the return value is the resolved `BEMTree` value
- **AND** no HTML serialization has occurred

### Requirement: Two tree sources converge
Markdown through the remark mdast → BEMJSON bridge and layout through block templates SHALL use the same `BEMTree` model and renderer. The build HTML stage SHALL pass the page content tree to the registered document handler and render the returned document, content included, in one render. The standard root extension wraps that content in an HTML document; a consumer MAY supply another document handler.

#### Scenario: Content and layout share the model
- **WHEN** a Markdown document and a layout block are rendered for one page
- **THEN** both produce `BEMTree` nodes handled by the same engine
- **AND** templates of the document apply to the content nodes

### Requirement: Composition helpers
The core SHALL export `b(block, elem?, content?, props?, entity?)`, which returns a BemNode with the block, the element only when given, the entity fields `mods`, `elemMods` and `mix`, the content (null by default) and `props` only when nonempty. It SHALL export `attributes(node, names)`, which returns the listed props whose values are strings or booleans and omits every other prop.

#### Scenario: Template exposes selected props
- **WHEN** a node composed with `b('link', undefined, null, { href: '/x', count: 3, extra: 'y' })` is passed to `attributes(node, ['href', 'count'])`
- **THEN** the result is `{ href: '/x' }`
- **AND** the composed node has no `elem` field

### Requirement: Classic BEM class generation
The engine SHALL build the class string from `block`, `elem`, `mods`, `elemMods`, and `mix` using the classic BEM scheme: `__` before an element, `_` before a modifier. There is exactly one naming scheme, without variants or configurable delimiters. Boolean mods emit the key only; `false`/`null` mods are dropped. `mix` contributes another block's classes.

#### Scenario: Classes are generated from the entity
- **WHEN** a node `{ block: 'menu', elem: 'item', elemMods: { active: true } }` is rendered
- **THEN** the class string is `menu__item menu__item_active`
- **AND** a `{ block: 'menu', mods: { size: 'm' } }` node yields `menu menu_size_m`
