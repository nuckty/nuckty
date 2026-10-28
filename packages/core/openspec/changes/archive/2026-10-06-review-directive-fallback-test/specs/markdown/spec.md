## ADDED Requirements

### Requirement: Leaf fallback regression evidence
Markdown regression tests SHALL assert visible label preservation for unknown leaf directives and for registered handlers that decline them, rather than merely checking an article wrapper.

#### Scenario: Unknown and declined leaf directive
- **WHEN** a labelled leaf directive has no handler or its handler returns null
- **THEN** tests verify the label remains in rendered content and no directive-specific block is emitted
