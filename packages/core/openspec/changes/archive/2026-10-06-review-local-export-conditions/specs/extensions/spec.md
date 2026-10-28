## ADDED Requirements

### Requirement: Local directory conditional entries
Local directory extensions SHALL resolve nested conditional exports using active Node ESM conditions in declaration order. A matching explicit null target SHALL block resolution. Main-only local packages and direct file modules SHALL retain their existing loading behavior.

#### Scenario: Nested Node import entry
- **WHEN** local exports contains node with an import entry followed by default
- **THEN** the nested import module registers its capabilities

#### Scenario: Earlier default condition
- **WHEN** default precedes import in local conditional exports
- **THEN** the default module registers its capabilities

#### Scenario: Inactive require condition
- **WHEN** require precedes import in local conditional exports
- **THEN** the import entry is selected and require is ignored

### Requirement: Invalid local export targets
Local extension exports SHALL reject invalid targets and SHALL skip invalid target alternatives in an export array before selecting its valid fallback. Targets SHALL remain relative to the package directory.

#### Scenario: Invalid array alternative
- **WHEN** an export array contains ../outside.mjs followed by ./index.mjs
- **THEN** the local extension selects index.mjs

#### Scenario: Invalid conditional value
- **WHEN** an active condition selects a numeric target
- **THEN** loading fails rather than selecting a later default

### Requirement: Local export URL identity
Local extension export targets SHALL preserve URL query and fragment identity and resolve encoded path characters as Node ESM package targets. Target containment validation SHALL apply to the pathname rather than query text.

#### Scenario: Encoded filename with module query
- **WHEN** a local export selects a percent-encoded filename with query and fragment
- **THEN** the module loads and observes the original query and fragment
