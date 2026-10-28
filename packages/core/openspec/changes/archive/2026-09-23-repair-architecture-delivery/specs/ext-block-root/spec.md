## MODIFIED Requirements

### Requirement: Page data via props
`root` SHALL receive `DocumentData` through `n.props`: page metadata, content, asset maps, sitemap, target data, language, and alternates. The default root SHALL include each distinct, nonempty supplied CSS URL once as a stylesheet link in `<head>` and each distinct, nonempty supplied JS URL once as a deferred script after page content. It SHALL not infer bundle names or page ownership; a consumer that needs page-specific bundle selection MAY override `root` on a later level.

#### Scenario: Block reads page data from props
- **WHEN** `root` renders with page data and duplicate or empty bundle references
- **THEN** it emits the title, optional alternate links, and each distinct nonempty CSS/JS URL once
- **AND** absent CSS/JS references add no asset tags
- **AND** the engine does not decide the `<head>` contents
