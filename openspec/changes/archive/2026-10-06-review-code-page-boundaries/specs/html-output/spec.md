## ADDED Requirements

### Requirement: Page content shape does not change preparation
HTML emission SHALL render every supported BEMTree content shape through the content templates and image-mapping pass before handing prepared content to the document handler. A single node SHALL NOT bypass the preparation applied to an equivalent one-item array. Empty content SHALL remain empty for the handler, and the original page tree SHALL remain available unchanged.

#### Scenario: Single raw content maps like array content
- **WHEN** a page carries one raw image node or an equivalent one-item array with a logical source path
- **THEN** both handler inputs contain the same prepared hashed-image markup
- **AND** both published HTML outputs agree
- **AND** empty or false content remains empty
