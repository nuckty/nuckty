## ADDED Requirements

### Requirement: Bilingual demo pages
The demo SHALL build Russian and English targets with translated pages, examples and interactive controls on demo.nuckty.ru and demo.nuckty.com.

#### Scenario: Both languages are built
- **WHEN** both demo targets are built
- **THEN** each target has five pages, the correct language, canonical origin and alternate-language links

### Requirement: Demo stylesheet property validation
The demo CSS lint gate SHALL reject unknown standard property names while accepting CSS custom properties.

#### Scenario: Misspelled border declarations
- **WHEN** a demo stylesheet declares aborder or aborder-radius instead of a known property
- **THEN** CSS lint reports the unknown declarations instead of passing them silently

## MODIFIED Requirements

### Requirement: Renders markdown through the single engine
The demo’s Markdown SHALL become a BEMTree through the core Markdown bridge and be serialized by the nu renderer. The document handler SHALL receive the article content as a tree; there is no alternative template engine.

#### Scenario: Markdown produces article BemNode
- **WHEN** the Markdown showcase builds
- **THEN** the output HTML contains `article__heading`, `article__paragraph`, `article__list` and `article__inline-code` classes
- **AND** the heading has a hierarchical `id` derived from its text

### Requirement: Precise demo instructions
The demo copy SHALL distinguish rendered examples, original source, the public file snapshot and the publication manifest. It SHALL explain unfamiliar terms before relying on them in instructions.

#### Scenario: Inspect build output
- **WHEN** a visitor opens the output page
- **THEN** the page explains which files are measured and which require local artifact access

## REMOVED Requirements

### Requirement: Bilingual demo

**Reason**: The scenario name did not describe the behavior.

**Migration**: The behavior is specified as "Bilingual demo pages".
