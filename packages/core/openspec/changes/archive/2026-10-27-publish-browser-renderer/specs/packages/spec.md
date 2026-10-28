## ADDED Requirements

### Requirement: Published browser renderer
The core archive SHALL expose `@nuckty/core/browser` with `Templates`, `render` and `renderToHtml` from the same renderer used by builds. This entry SHALL bundle for browser execution without Node built-ins or unpublished source files.

#### Scenario: Registry consumer bundles a preview
- **WHEN** a website bundles `@nuckty/core/browser` with a browser target
- **THEN** the bundle contains the compiled renderer without Node built-in dependencies
- **AND** its HTML matches the core renderer for the same tree and templates
