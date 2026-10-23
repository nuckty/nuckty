## MODIFIED Requirements

### Requirement: Declares nuckty as a dependency and builds via the CLI
The demo SHALL declare `nuckty` as a `file:` dependency and invoke the build via the `nuckty` CLI bin (`"build": "..."`). The build SHALL resolve the demo root as `process.cwd()`, read the demo's `config/`, and write the built site under the demo's output dir. (Engine: "Consumption via dependency + CLI".)

#### Scenario: Clean clone builds
- **WHEN** the demo and its file-linked sibling projects are present, their dependencies and dist builds are prepared, and `npm install && npm run build` runs
- **THEN** the build completes without errors
- **AND** writes `site/html/index.html`

### Requirement: Supplies blocks as extensions
The demo SHALL load the standard root document extension and gallery extension through ext[]. Site block templates SHALL export a default templates() function and load through the configured levels and page bemdecl. Blocks SHALL NOT be described as individual register(env) extensions.

#### Scenario: Blocks are declared in ext
- **WHEN** `config-nuckty.ts` is inspected
- **THEN** root and gallery packages are listed in ext[], while site template files load through levels and the page declaration

### Requirement: Renders markdown through the single engine
The demo’s Markdown SHALL become a BEMTree through the core Markdown bridge and be serialized by the nu renderer. The build MAY pass already serialized article content to the document handler through trusted raw markup; there is no alternative template engine.

#### Scenario: Markdown produces article BemNode
- **WHEN** `index.md` (with a heading, a paragraph, a list, and inline code) builds
- **THEN** the output HTML contains `article__heading`, `article__paragraph`,
  `article__list`, `article__inline-code` classes
- **AND** the heading has a hierarchical `id` derived from its text

### Requirement: Output is minimal and valid
The built index.html SHALL use the serializer’s minimization rules: supported optional tags omitted, attributes unquoted where permitted and void elements without a slash. Actual fixture validity SHALL be checked on the built artifact through Nu Html Checker rather than inferred from compactness.

#### Scenario: Optional tags omitted
- **WHEN** the built `index.html` is inspected
- **THEN** it does not contain `</html>` or `</body>`
- **AND** single-token attribute values are unquoted (e.g. `charset=utf-8`)

### Requirement: Documents itself
The demo SHALL ship a README explaining how to run it and what it proves, so a new consumer author can copy it as a starting point.

#### Scenario: README explains the demo
- **WHEN** the demo README is read
- **THEN** it explains how to run the build and what the demo proves

## Out of scope for the demo
- Multi-target builds and cross-target hreflang: the demo declares one target; their coverage is established separately.
- CSS/JS bundling beyond what the default stages emit.

