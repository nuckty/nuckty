## MODIFIED Requirements

### Requirement: BEMTree node fields
The node type SHALL be `BemNode`, with optional typed fields `block`, `elem`, `mods`, `elemMods`, `mix`, `content`, `tag`, `attrs`, `cls`, `js`, `bem`, `props`, `raw` and `tightList`. `BEMTree` SHALL include a node, text, recursively nested arrays and empty `null`/`undefined`/`false` positions.

#### Scenario: A node carries typed fields
- **WHEN** a node `{ block: 'menu', elem: 'item', mods: { size: 'm' } }` is authored
- **THEN** the compiler checks each field against `BemNode`

### Requirement: BEMTree field semantics
The fields SHALL carry these semantics: `block`/`elem` name the BEM entity; `mods`/`elemMods` are modifier maps; `content` is a recursive `BEMTree`; `tag` is an HTML tag or `false` (emit content without a wrapper); `attrs` is the HTML attribute map; `cls` supplies an extra non-BEM class; `js` carries client JavaScript data; `bem` toggles BEM class generation (default true).

#### Scenario: tag false emits content only
- **WHEN** a node carries `tag: false`
- **THEN** its content is emitted without a tag

### Requirement: Class generation from the entity
The engine SHALL build the class string from `block`, `elem`, `mods`, `elemMods`, and `mix` using the classic BEM scheme: `__` before an element, `_` before a modifier. There is exactly one naming scheme, without variants. Boolean mods emit the key only; `false`/`null` mods are dropped. `mix` contributes another block's classes.

#### Scenario: Classes are generated from the entity
- **WHEN** a node `{ block: 'menu', elem: 'item', elemMods: { active: true } }` is rendered
- **THEN** the class string is `menu__item menu__item_active`
- **AND** a `{ block: 'menu', mods: { size: 'm' } }` node yields `menu menu_size_m`

### Requirement: props is a template-only channel
`props` SHALL carry data for templates and SHALL NOT be serialized automatically. A template MAY read `n.props` and expose its values through content or attributes. The field SHALL NOT be described as a secrecy boundary. Its values MAY include non-JSON objects such as `Map`; callers own any serialization of those values.

#### Scenario: props never reaches HTML
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
Markdown through the remark mdast → BEMJSON bridge and layout through block templates SHALL use the same `BEMTree` model and renderer. The build HTML stage MAY serialize content first and pass it as a trusted `raw` node to the registered document handler. The standard root extension wraps that content in an HTML document; a consumer MAY supply another document handler.

#### Scenario: Content and layout share the model
- **WHEN** a Markdown document and a layout block are rendered for one page
- **THEN** both produce `BEMTree` nodes handled by the same engine
- **AND** the build MAY pass serialized content through an explicit trusted raw node

