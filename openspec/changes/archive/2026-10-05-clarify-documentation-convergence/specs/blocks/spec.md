## REMOVED Requirements

### Requirement: Co-located assets bundle by deps
**Reason**: Rename an inaccurate heading without changing implemented behavior.
**Migration**: Use the corresponding clarified requirement in this change.

## ADDED Requirements

### Requirement: Explicit bundle asset declarations
CSS and JavaScript SHALL be collected from the explicitly declared blocks of each configured bundle, across the configured levels. Rendered page content SHALL NOT add undeclared blocks automatically. A consumer’s document handler or root template SHALL determine which emitted bundles its pages load.

#### Scenario: Declared block contributes its assets
- **WHEN** a configured bundle declaration lists a block with CSS or JavaScript
- **THEN** its files contribute to that bundle
- **AND** a block absent from the declaration contributes no assets merely by appearing in page content

