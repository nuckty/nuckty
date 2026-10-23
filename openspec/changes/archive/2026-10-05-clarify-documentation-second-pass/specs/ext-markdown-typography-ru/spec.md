## MODIFIED Requirements

### Requirement: Registered as an mdast transform
The extension SHALL register via `env.markdown.use(...)` a remark plugin that walks mdast before the mdast → BEMJSON bridge and rewrites text nodes. It SHALL be a markdown-extension only (no block, no CLI, no stage).

#### Scenario: Transform runs before rendering
- **WHEN** the extension is loaded and a `.md` is processed
- **THEN** its mdast transform runs before the BEMJSON bridge
- **AND** it only rewrites text, adding no block or command

### Requirement: Em-dash and non-breaking spaces
The transform SHALL normalize supported spacing patterns around an existing em dash (`—`, U+2014) to a non-breaking space before it and an ordinary space after it. It SHALL NOT convert a hyphen into an em dash or insert non-breaking spaces after short prepositions. It SHALL operate only on text nodes without changing surrounding markup.

#### Scenario: Russian text is typeset
- **WHEN** Russian prose contains the supported `слово — текст` pattern
- **THEN** the space before the existing em dash becomes non-breaking and the space after remains ordinary
- **AND** spaced hyphens and short prepositions remain unchanged
- **AND** the surrounding markup structure is unchanged

### Requirement: Code is skipped
The transform SHALL skip code nodes (fenced/indented code blocks and inline code), so code is never altered by typography.

#### Scenario: Code blocks are untouched
- **WHEN** the document contains a fenced code block and inline code
- **THEN** their contents are left exactly as written
- **AND** only prose text is typeset

### Requirement: Optional per language
The extension SHALL be optional: a site loads it only when it wants Russian typography. Without it, the core emits text verbatim with no typographic substitutions.

#### Scenario: English site omits it
- **WHEN** a site does not list the typography extension in `ext`
- **THEN** no typographic substitutions are applied
- **AND** the core has no built-in typography
