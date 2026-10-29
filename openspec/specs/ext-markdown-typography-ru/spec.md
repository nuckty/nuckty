# nuckty — ext-markdown-typography-ru spec (1.0.0)

## Purpose

Specify an optional mdast text transform that normalizes spacing around existing em dashes. It inserts a non-breaking space before the dash and an ordinary space after it in the supported patterns. It does not convert hyphens or add non-breaking spaces after short prepositions. Code nodes remain untouched.

## Requirements

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

#### Scenario: Custom element names remain ordinary prose
- **WHEN** prose appears inside `code-widget`, `pre-view`, `script-note` or `style-note`
- **THEN** those complete element names do not open literal code regions
- **AND** the prose receives the same typography as surrounding text

### Requirement: Optional per language
The extension SHALL be optional: a site loads it only when it wants Russian typography. Without it, the core emits text verbatim with no typographic substitutions.

#### Scenario: English site omits it
- **WHEN** a site does not list the typography extension in `ext`
- **THEN** no typographic substitutions are applied
- **AND** the core has no built-in typography

### Requirement: Horizontal spacing converges without changing line boundaries
Supported em-dash prose patterns SHALL converge to one NBSP before the existing dash and one ordinary space after it, including repeated spaces, tabs or NBSP already present. The transform SHALL retain line breaks and a dialogue dash at the start of a line. It SHALL retain established non-matching patterns such as an unspaced numeric range. Markdown link spacing SHALL remain authored, and code/raw literal contexts SHALL remain untouched.

#### Scenario: Existing NBSP and repeated horizontal spaces converge
- **WHEN** prose has an existing leading NBSP, tab or repeated horizontal spaces around an em dash
- **THEN** the same canonical horizontal spacing is produced
- **AND** applying the transform again changes nothing
- **AND** newlines, leading dialogue dashes and code retain their structure

### Requirement: Dash after inline markup
A text node that starts with horizontal whitespace and an em dash after an inline sibling such as a link, emphasis or inline code SHALL receive a non-breaking space before the dash and a regular space after it. A dash after a line break SHALL remain authored.

#### Scenario: Link followed by a dash
- **WHEN** Markdown contains `[ссылка](/x) — описание`
- **THEN** the rendered text after the link is a non-breaking space, the dash and a space
