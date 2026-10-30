## REMOVED Requirements

### Requirement: Page content shape does not change preparation

**Reason**: Content is no longer serialized and post-processed before the document handler; raw image paths are mapped in the Markdown bridge.

**Migration**: Read `data.content` as a BEMTree; no preparation step exists between the bridge and the handler.

## ADDED Requirements

### Requirement: Content reaches the document as a tree
HTML emission SHALL hand the page's BEMTree content to the document handler unchanged, whatever its shape, and SHALL render the returned document with the build's templates in one render. Empty content SHALL remain empty for the handler.

#### Scenario: Content templates apply inside the document
- **WHEN** a page's content contains a `note` block and the build has a `note` template
- **THEN** the handler receives the content tree itself
- **AND** the published HTML contains the `note` template output inside the document
