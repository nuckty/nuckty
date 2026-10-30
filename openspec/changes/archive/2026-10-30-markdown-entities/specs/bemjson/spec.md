## MODIFIED Requirements

### Requirement: Two tree sources converge
Markdown through the remark mdast → BEMJSON bridge and layout through block templates SHALL use the same `BEMTree` model and renderer. The build HTML stage SHALL pass the page content tree to the registered document handler and render the returned document, content included, in one render. The standard root extension wraps that content in an HTML document; a consumer MAY supply another document handler.

#### Scenario: Content and layout share the model
- **WHEN** a Markdown document and a layout block are rendered for one page
- **THEN** both produce `BEMTree` nodes handled by the same engine
- **AND** templates of the document apply to the content nodes

## REMOVED Requirements

### Requirement: Entity stringification respects modifier ownership

**Reason**: The single-entity stringifier was removed with the other unused naming helpers.

**Migration**: Class strings come from rendering; element modifiers are rendered from `elemMods`.
