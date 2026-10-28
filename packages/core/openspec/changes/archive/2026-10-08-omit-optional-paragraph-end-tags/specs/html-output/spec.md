## MODIFIED Requirements

### Requirement: Closing-tag omission
Closing-tag omission SHALL preserve the intended parent and sibling relationships of a conforming HTML tree. Non-tight ul/ol lists SHALL retain every li end tag. Article lists (`block: 'article', elem: 'list'`) SHALL omit li end tags only before another li and retain the trailing end tag. Other lists explicitly marked `tightList:true` SHALL omit li end tags before another li and at the end of the list, retaining them before script, text, raw or other siblings. Nested arrays and tag-false fragments SHALL participate in sibling lookahead without adding a wrapper. List policy SHALL belong to the immediate list parent. Paragraphs SHALL use the contextual HTML paragraph end-tag omission rules. Optional table cell, row and section end tags MAY be omitted where HTML parsing preserves the intended conforming table tree; non-optional end tags SHALL remain.

#### Scenario: Optional closing tags are omitted
- **WHEN** ordinary adjacent li children are rendered in an article list or an explicitly tight list
- **THEN** li end tags between adjacent li siblings are omitted
- **AND** the trailing end tag is retained for the article list and omitted for the explicitly tight list
- **AND** ordinary non-tight lists retain all li end tags

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

## REMOVED Requirements

### Requirement: Explicit paragraph closing tags
**Reason**: Legacy byte-output parity unnecessarily retains optional paragraph end tags.
**Migration**: Use contextual paragraph omission; consumers comparing exact HTML must update their expected bytes.

## ADDED Requirements

### Requirement: Contextual paragraph end-tag omission
The serializer SHALL omit a paragraph end tag before a resolved HTML sibling named address, article, aside, blockquote, details, dialog, div, dl, fieldset, figcaption, figure, footer, form, h1 through h6, header, hgroup, hr, main, menu, nav, ol, p, pre, search, section, table or ul. It SHALL also omit the tag at the end of a known HTML parent other than a, audio, del, ins, map, noscript, video or an autonomous custom element. It SHALL retain the tag before inline, text or opaque raw successors, in foreign content and when the parent of a trailing fragment is unknown. Document-mode trailing newlines SHALL remain outside a trailing body paragraph.

#### Scenario: Card description ends its article
- **WHEN** a card article ends with a description paragraph
- **THEN** the description has no explicit paragraph closing tag before the article closes

#### Scenario: Boundaries requiring a close
- **WHEN** a paragraph precedes literal text, an inline element or opaque raw content, or ends an excluded parent
- **THEN** its closing tag remains explicit

#### Scenario: Document formatting retains its position
- **WHEN** document mode ends a body with a paragraph
- **THEN** the paragraph closes before the two document-formatting newline characters
