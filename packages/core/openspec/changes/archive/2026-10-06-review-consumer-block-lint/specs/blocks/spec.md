## ADDED Requirements

### Requirement: Consumer block ownership lint import tracking
Consumer block ownership lint SHALL retain the imported block binding across subsequent unrelated and type-only imports. It SHALL reject foreign block declarations and top-level declarations while accepting valid owned declarations, including aliased imports.

#### Scenario: Separate type import
- **WHEN** a block template imports block followed by nuckty types
- **THEN** ownership and declaration-scope diagnostics remain active

#### Scenario: Aliased owned declaration
- **WHEN** an aliased block import declares the file owner inside templates
- **THEN** ownership lint accepts that declaration

### Requirement: Lexical block API binding
Consumer block ownership lint SHALL inspect actual named block import bindings rather than remember a single identifier string. Multiple aliases and hoisted imports SHALL remain checked; a shadowing local function SHALL NOT be treated as the imported API.

#### Scenario: Multiple aliases
- **WHEN** a template imports block with two aliases and the earlier alias declares a foreign block
- **THEN** ownership lint reports that declaration

#### Scenario: Shadowed helper
- **WHEN** a local helper shadows an imported block name
- **THEN** its calls do not receive API ownership diagnostics
