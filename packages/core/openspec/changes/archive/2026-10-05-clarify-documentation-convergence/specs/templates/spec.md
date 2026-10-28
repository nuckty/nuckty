## REMOVED Requirements

### Requirement: next() merges toward the node
**Reason**: Rename an inaccurate heading without changing implemented behavior.
**Migration**: Use the corresponding clarified requirement in this change.

## ADDED Requirements

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

## MODIFIED Requirements

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

### Requirement: block() authoring syntax
A template SHALL be registered by calling `block` with a predicate and a definition inside the default `templates()` export of a `.nu.ts` file. `block('name')(def)` targets a whole block; `block('name').elem('e')(def)` targets an element; `.mod()`/`.elemMod()` narrow further; `.when(pred)` adds an arbitrary predicate. A mode value MAY be a literal or a function `(n, next) => ...`.

#### Scenario: Authoring a block and an element
- **WHEN** a consumer writes `block('menu')({ tag: 'ul' })` and `block('menu').elem('item')({ tag: 'li' })`
- **THEN** `menu` nodes render as `<ul>` and `menu__item` nodes as `<li>`
- **AND** `.when((n) => Boolean(n.props?.submenu))` applies only when the predicate holds
