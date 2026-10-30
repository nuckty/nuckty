# nuckty — blocks spec (1.0.0)

## Purpose

Specify how blocks are authored and found: one `.nu.ts` file per block, the deps mechanism that loads blocks without manual registration, and the levels that let extensions supply blocks and sites override them. A block is a reusable interface unit; in BEM everything is a block, including the page layout and the `<html>` wrapper.

## Requirements

### Requirement: One .nu.ts file per block
A block SHALL be described by `<level>/<name>/<name>.nu.ts` with a default `templates()` export. The block file SHALL declare only its own block using the scoped `block()` API; it SHALL NOT use `register(env)`, execute top-level declarations, import CSS/JS or call a floating `applyNext()`. CSS/JS are co-located resources selected by the declared bundle dependencies.

#### Scenario: A block file declares its own templates
- **WHEN** `blocks/button/button.nu.ts` exports `default function templates()` that calls `block('button')({ tag: 'button' })`
- **THEN** the block loader calls that export in the active Templates context when `button` is required
- **AND** the file does not register a different block or import its CSS/JS

### Requirement: Dependencies via bemdecl
A bundle SHALL declare the blocks it uses in `<bundle>/<bundle>.bemdecl.js` as a CommonJS array of block names or an object with `mustDeps` and `shouldDeps` arrays. The current loader SHALL flatten the object form and remove repeated block names. The declaration is an explicit bundle list: blocks required by its content or layout SHALL be listed there; transitive declarations of listed blocks are not traversed automatically. A later configured level SHALL override an earlier declaration for the same bundle. A missing declaration MAY yield an empty bundle, but an existing malformed or unsupported declaration SHALL fail with its path and cause.

#### Scenario: Explicit bundle dependencies are loaded
- **WHEN** a bundle declaration lists `root`, `page` and `menu`
- **THEN** the corresponding templates and co-located assets are selected
- **AND** no unrelated block is added by an implicit transitive search

#### Scenario: Existing invalid declaration fails
- **WHEN** a declaration file exists but its CommonJS syntax or dependency shape is invalid
- **THEN** the build fails with the declaration path rather than silently dropping the bundle

### Requirement: Levels and override
Levels SHALL be searched in order for `.nu.ts`, `.bemdecl.js`, CSS and JS. The consumer's `config/levels.json` entries are relative to the consumer root; an extension MAY add an absolute blocks directory through `env.levels.add`. Later levels win for a block template or a bundle declaration, while CSS/JS bundling uses the selected declared dependencies. The site MAY place an override on its later consumer level.

#### Scenario: Site overrides an extension block
- **WHEN** the same block exists in an extension level and a later consumer level
- **THEN** the later template and declaration take precedence
- **AND** absolute extension levels can still contribute selected CSS/JS

### Requirement: Explicit bundle asset declarations
CSS and JavaScript SHALL be collected from the explicitly declared blocks of each configured bundle, across the configured levels. Rendered page content SHALL NOT add undeclared blocks automatically. A consumer’s document handler or root template SHALL determine which emitted bundles its pages load.

#### Scenario: Declared block contributes its assets
- **WHEN** a configured bundle declaration lists a block with CSS or JavaScript
- **THEN** its files contribute to that bundle
- **AND** a block absent from the declaration contributes no assets merely by appearing in page content

### Requirement: Element entries in declarations
A declaration entry SHALL be a block or `block__elem` string, or an object: `{ block }` names the block, `{ block, elem }` names only that element (or each of an `elem` array), and `{ block, elems }` names the block and each listed element. Element entities SHALL bundle their element CSS and JavaScript files. An object field other than `block`, `elem` and `elems` SHALL fail the declaration.

#### Scenario: Object element entries
- **WHEN** a declaration lists `{ block: 'nav', elems: ['link'] }`
- **THEN** the bundle includes `nav` and `nav__link`
