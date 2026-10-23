## ADDED Requirements

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

