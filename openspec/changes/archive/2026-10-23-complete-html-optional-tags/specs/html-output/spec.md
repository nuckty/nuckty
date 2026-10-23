## MODIFIED Requirements

### Requirement: Document wrapper minimization
With `document: true`, the serializer SHALL prepend lowercase `<!doctype html>` and append two newline characters. Without document mode it SHALL add neither. Wrapper nodes SHALL come from the supplied resolved tree: attribute-free html/head/body start tags SHALL be omitted where HTML parsing preserves the supplied document tree, and a tree that intentionally omits an optional head wrapper SHALL not acquire one. For a conforming document tree, optional closing `</html>`, `</head>` and `</body>` tags MAY be omitted where that preserves the intended structure; required end tags SHALL remain at comment/whitespace boundaries and where opaque raw prevents proving omission safe. The serializer SHALL add no indentation; literal text and raw content MAY contain newlines.

#### Scenario: Optional wrapper tags are omitted
- **WHEN** a conforming document tree contains explicit html, head and body nodes and document mode is enabled
- **THEN** eligible attribute-free opening tags and optional closing tags are omitted without moving comments or authored whitespace
- **AND** the output begins with `<!doctype html>` and ends with two newline characters

#### Scenario: Fragment rendering has no document envelope
- **WHEN** the same tree is rendered without document mode
- **THEN** no doctype or trailing service newlines are added

#### Scenario: Document comments retain their intended parent
- **WHEN** raw comments follow head, body or html nodes
- **THEN** the preceding node retains its closing tag so the comments remain outside it
- **AND** a head followed by literal whitespace retains its closing tag

#### Scenario: Head opening boundaries are preserved
- **WHEN** head has emitted attributes/classes/data-bem, begins with literal text or nonempty opaque raw content, or is outside the HTML html-parent context
- **THEN** its opening tag remains
- **AND** an empty string, empty raw string, null position or tag-false fragment does not block an otherwise eligible omission

### Requirement: Closing-tag omission
The serializer SHALL apply HTML optional-end-tag rules to html, head, body, li, dt, dd, p, rt, rp, optgroup, option, colgroup, caption, thead, tbody, tfoot, tr, td and th in their HTML contexts. All lists SHALL use the same HTML rules regardless of block names or the legacy tightList field. Nested arrays and tag-false fragments SHALL participate in sibling lookahead. Omission SHALL preserve parsed structure, attributes, literal whitespace and comment placement; foreign elements SHALL retain their required tags. Document-formatting newlines SHALL not be absorbed into a final paragraph.

#### Scenario: Optional list and definition tags
- **WHEN** li, dt/dd, rt/rp or option/optgroup are followed by an eligible peer or reach an allowed parent tail
- **THEN** their optional end tags are omitted
- **AND** required ends remain before other siblings, whitespace and comments

#### Scenario: Optional table tags
- **WHEN** a table contains eligible colgroup/tbody nodes without emitted attributes
- **THEN** their start tags are omitted only when first-child and preceding omitted-end constraints permit it
- **AND** optional caption, colgroup, row-group, row and cell ends follow HTML rules without merging adjacent groups

#### Scenario: Parse-tree regression
- **WHEN** minimized documents and fragments are parsed as HTML alongside explicit-tag reference output
- **THEN** element namespaces, attributes, text, comments and nesting match
- **AND** wrappers with emitted attributes or BEM classes remain explicit

#### Scenario: Optional closing tags are omitted
- **WHEN** ordinary adjacent li children are rendered in any HTML list
- **THEN** li end tags between adjacent li siblings are omitted
- **AND** the trailing end tag is omitted at the list tail
- **AND** ordinary non-tight lists use the same HTML omission rules

#### Scenario: Mixed siblings preserve their parent
- **WHEN** a tight ul has li, script and li children, including children supplied through fragments
- **THEN** the first li closes before script, so script remains a direct child of ul
- **AND** raw or text siblings also require the preceding li to close

#### Scenario: Conventional table omissions remain compact
- **WHEN** a conforming table contains a tbody, tr and adjacent td children
- **THEN** optional cell, row and section end tags may be omitted without changing the parsed table structure

#### Scenario: Table siblings retain their boundaries
- **WHEN** cells, rows or row groups are followed by scripts, literal whitespace or raw comments, including siblings through fragments
- **THEN** required end tags are retained so those siblings do not become children of the preceding cell, row or group
- **AND** a thead before a direct tr retains its end tag
