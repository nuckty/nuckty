## MODIFIED Requirements

### Requirement: block() authoring syntax
A template SHALL be registered by calling `block` with a predicate and a definition inside the default `templates()` export of a `.nu.ts` file. `block('name')(def)` targets a whole block; `block('name').elem('e')(def)` targets an element; `.mod(name, value?)` narrows to a modifier of the selected entity — a block modifier on a block selector and an element modifier after `.elem()`; `.when(pred)` adds an arbitrary predicate. `.elem()` after `.mod()` SHALL be rejected when declared. A mode value MAY be a literal or a function `(n, next) => ...`.

#### Scenario: Authoring a block and an element
- **WHEN** a consumer writes `block('menu')({ tag: 'ul' })` and `block('menu').elem('item')({ tag: 'li' })`
- **THEN** `menu` nodes render as `<ul>` and `menu__item` nodes as `<li>`
- **AND** `.when((n) => Boolean(n.props?.submenu))` applies only when the predicate holds

#### Scenario: Element modifier after elem
- **WHEN** a consumer writes `block('menu').elem('item').mod('active')({ tag: 'b' })`
- **THEN** a `menu__item` node with `elemMods: { active: true }` renders as `<b>`
- **AND** a `menu__item` node with only block `mods: { active: true }` keeps its element template
