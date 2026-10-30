## MODIFIED Requirements

### Requirement: BEMTree node fields
The node type SHALL be `BemNode`, with optional typed fields `block`, `elem`, `mods`, `elemMods`, `mix`, `content`, `tag`, `attrs`, `cls`, `js`, `bem`, `props` and `raw`. `BEMTree` SHALL include a node, text, recursively nested arrays and empty `null`/`undefined`/`false` positions.

#### Scenario: A node carries typed fields
- **WHEN** TypeScript type-checks a node explicitly typed as BemNode
- **THEN** the compiler checks each field against `BemNode`
- **AND** the build loader itself only transpiles TypeScript and does not replace that check

## REMOVED Requirements

### Requirement: Class generation from the entity

**Reason**: The requirement described a configurable naming preset that no longer exists.

**Migration**: Use the classic separators; there is no preset to pass.

## ADDED Requirements

### Requirement: Classic BEM class generation
The engine SHALL build the class string from `block`, `elem`, `mods`, `elemMods`, and `mix` using the classic BEM scheme: `__` before an element, `_` before a modifier. There is exactly one naming scheme, without variants or configurable delimiters. Boolean mods emit the key only; `false`/`null` mods are dropped. `mix` contributes another block's classes.

#### Scenario: Classes are generated from the entity
- **WHEN** a node `{ block: 'menu', elem: 'item', elemMods: { active: true } }` is rendered
- **THEN** the class string is `menu__item menu__item_active`
- **AND** a `{ block: 'menu', mods: { size: 'm' } }` node yields `menu menu_size_m`
