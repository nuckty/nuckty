## ADDED Requirements

### Requirement: Markdown final newline
Repository Markdown files SHALL end with exactly one LF and no trailing blank lines. The lint command SHALL reject invalid endings, and the fixer SHALL normalize them without changing the preceding content.

#### Scenario: Invalid Markdown ending
- **WHEN** a Markdown file has no final newline or has trailing blank lines
- **THEN** lint fails and identifies the file
- **AND** lint fix replaces the ending with one LF
