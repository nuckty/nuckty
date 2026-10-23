## MODIFIED Requirements

### Requirement: Dependencies via bemdecl
A bundle SHALL declare the blocks it uses in `<bundle>/<bundle>.bemdecl.js` as a CommonJS array of block names or an object with `mustDeps` and `shouldDeps` arrays. The current loader SHALL flatten the object form and remove repeated block names. The declaration is an explicit bundle list: blocks required by its content or layout SHALL be listed there; transitive declarations of listed blocks are not traversed automatically. A later configured level SHALL override an earlier declaration for the same bundle. A missing declaration MAY yield an empty bundle, but an existing malformed or unsupported declaration SHALL fail with its path and cause.

#### Scenario: Explicit bundle dependencies are loaded
- **WHEN** a bundle declaration lists `root`, `page` and `menu`
- **THEN** the corresponding templates and co-located assets are selected
- **AND** no unrelated block is added by an implicit transitive search

#### Scenario: Existing invalid declaration fails
- **WHEN** a declaration file exists but its CommonJS syntax or dependency shape is invalid
- **THEN** the build fails with the declaration path rather than silently dropping the bundle

### Requirement: One .nu.ts file per block
A block SHALL be described by `<level>/<name>/<name>.nu.ts` with a default `templates()` export. The block file SHALL declare only its own block using the scoped `block()` API; it SHALL NOT use `register(env)`, execute top-level declarations, import CSS/JS or call a floating `applyNext()`. CSS/JS are co-located resources selected by the declared bundle dependencies.

#### Scenario: A block file declares its own templates
- **WHEN** `blocks/button/button.nu.ts` exports `default function templates()` that calls `block('button')({ tag: 'button' })`
- **THEN** the block loader calls that export in the active Templates context when `button` is required
- **AND** the file does not register a different block or import its CSS/JS

### Requirement: Levels and override
Levels SHALL be searched in order for `.nu.ts`, `.bemdecl.js`, CSS and JS. The consumer's `config/levels.json` entries are relative to the consumer root; an extension MAY add an absolute blocks directory through `env.levels.add`. Later levels win for a block template or a bundle declaration, while CSS/JS bundling uses the selected declared dependencies. The site MAY place an override on its later consumer level.

#### Scenario: Site overrides an extension block
- **WHEN** the same block exists in an extension level and a later consumer level
- **THEN** the later template and declaration take precedence
- **AND** absolute extension levels can still contribute selected CSS/JS
