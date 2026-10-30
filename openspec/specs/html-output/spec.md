# nuckty — html-output spec (1.0.0)

## Purpose

Specify the HTML serialization contract for resolved BEMJSON: contextual escaping, structure-preserving optional tags, explicit trusted raw content and stable document formatting. One serializer mode serves development and production. Unit tests verify exact output; external HTML validation is a separate check, not a claim about every arbitrary input tree.

## Requirements

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

### Requirement: Void elements and boolean attributes
HTML void elements SHALL be emitted as `<name attrs>` without a slash or end tag: `area, base, br, col, embed, hr, img, input, link, meta, param, source, track, wbr`. HTML tag and boolean-attribute matching SHALL be ASCII case-insensitive while retaining authored spelling. Non-ASCII attribute names SHALL NOT be folded into recognized boolean names. Empty SVG shapes (`path`, `circle`, `ellipse`, `line`, `polygon`, `polyline`, `rect`, `use`, `stop`) SHALL use `/>` inside SVG. `foreignObject` SHALL restore HTML serialization for its descendants, and a nested svg SHALL re-enter SVG serialization. Boolean attributes (`muted`, `autoplay`, `playsinline`, `async`, `defer`, `disabled`, `checked`, `selected`, and the supported HTML boolean set) SHALL be emitted by name without a value when present; null, undefined and false attribute values SHALL be omitted. Enumerated `hidden` string values such as `until-found` SHALL be preserved; `hidden:true` SHALL emit a bare attribute and `hidden:false` SHALL omit it.

#### Scenario: Void tag has no slash, boolean attr is bare
- **WHEN** an img with attributes and a disabled control are rendered
- **THEN** the img has no slash or closing tag and disabled appears without a value
- **AND** an empty SVG path uses `/>`

#### Scenario: SVG context does not leak through foreignObject
- **WHEN** foreignObject contains an HTML-context path and a nested svg containing an empty path
- **THEN** the HTML-context path has an explicit end tag and the nested SVG path self-closes

### Requirement: Attribute quoting
BEMJSON attribute values SHALL carry their logical, unescaped values. The serializer SHALL encode `&`, `"`, `<` and `>` as HTML entities exactly once, preserving their decoded values. Encoded attribute values SHALL use double quotes when empty or containing whitespace, a quote, apostrophe, backtick, equals sign, or a literal angle bracket; otherwise they MAY be emitted unquoted. A comma alone SHALL NOT force quotes. Generated `data-bem` SHALL always use a double-quoted escaped JSON value. BEM classes, mix classes and explicit `cls` SHALL use the same attribute escaping. Names and trusted raw HTML are not a sanitization boundary.

#### Scenario: Quotes are dropped where legal
- **WHEN** an attribute value is a single safe token
- **THEN** it is emitted unquoted
- **AND** a comma alone does not force quoting while an empty value is emitted as `alt=""`

#### Scenario: Quoting follows escaping
- **WHEN** an attribute's logical value is a single quotation mark or angle bracket
- **THEN** the serializer encodes it as an HTML entity before choosing outer quotes
- **AND** the encoded token may be unquoted while retaining its decoded value

#### Scenario: Logical values survive encoding
- **WHEN** an attribute or data-bem string includes `>`, `<`, ampersand or quotation marks
- **THEN** its HTML-decoded value equals the original value without additional attributes
- **AND** parsing the decoded data-bem JSON preserves the original object

#### Scenario: BEM class suppression is explicit
- **WHEN** a node has only mix classes
- **THEN** those classes are emitted
- **AND** setting `bem:false` suppresses BEM and mix classes and data-bem, while preserving explicit `cls`

### Requirement: Closing-tag omission
The serializer SHALL apply HTML optional-end-tag rules to html, head, body, li, dt, dd, p, rt, rp, optgroup, option, colgroup, caption, thead, tbody, tfoot, tr, td and th in their HTML contexts. All lists SHALL use the same HTML rules regardless of block names. Nested arrays and tag-false fragments SHALL participate in sibling lookahead. Omission SHALL preserve parsed structure, attributes, literal whitespace and comment placement; foreign elements SHALL retain their required tags. Document-formatting newlines SHALL not be absorbed into a final paragraph.

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

### Requirement: Literal whitespace and comments
The serializer SHALL add no indentation or separators between adjacent structural nodes. It SHALL preserve literal whitespace supplied in text and attribute values, including whitespace-only text between elements and meaningful whitespace inside pre/code. Text escaping MAY change the encoded bytes but SHALL preserve the logical text. Trusted raw content, including HTML comments and newlines, SHALL pass through unchanged; the serializer SHALL NOT run a blanket whitespace or comment-removal pass. Document-mode trailing newlines are the explicit exception defined by Document wrapper minimization.

#### Scenario: Literal whitespace is preserved
- **WHEN** adjacent structural nodes and a pre/code block are rendered
- **THEN** the serializer adds no whitespace between the structural nodes
- **AND** explicitly supplied whitespace and the code text, including its trailing newline, are preserved

#### Scenario: Raw comments remain verbatim
- **WHEN** trusted raw content contains an HTML comment or deliberate line breaks
- **THEN** those bytes are emitted unchanged

### Requirement: Special cases
The serializer SHALL pass trusted raw nodes through verbatim, without escaping or whitespace rewriting. Raw HTML supplied by Markdown SHALL retain its authored quoting and whitespace at this serialization boundary. Ordinary string content SHALL be escaped as text; executable script payloads that require verbatim HTML SHALL be supplied explicitly as trusted raw content. SVG path attribute values SHALL be escaped as attribute values without parsing their contents as tags. UTF-8 text SHALL retain its characters subject to contextual text/attribute escaping. Page-title separators belong to the document author or template and SHALL NOT be inserted by the serializer.

#### Scenario: raw and SVG path survive intact
- **WHEN** a tree contains trusted raw script markup and an SVG path with a d attribute containing `c/`
- **THEN** the raw markup is emitted verbatim
- **AND** the path value remains an attribute value without generating tags

#### Scenario: Ordinary content remains text
- **WHEN** ordinary string content contains an angle bracket or ampersand
- **THEN** it is escaped as text rather than interpreted as trusted HTML

### Requirement: One render mode
The serializer SHALL use one minimization mode in development and production. Identical resolved input and options SHALL produce identical output regardless of the calling environment. It SHALL offer no pretty-HTML development mode. Validity depends on the authored tree; debugging MAY inspect output: bemjson with an explicit Templates collection.

#### Scenario: dev equals prod
- **WHEN** identical resolved input is serialized with identical options in development and production
- **THEN** the HTML is identical byte-for-byte
- **AND** there is no formatted-HTML dev mode

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

### Requirement: Content reaches the document as a tree
HTML emission SHALL hand the page's BEMTree content to the document handler unchanged, whatever its shape, and SHALL render the returned document with the build's templates in one render. Empty content SHALL remain empty for the handler.

#### Scenario: Content templates apply inside the document
- **WHEN** a page's content contains a `note` block and the build has a `note` template
- **THEN** the handler receives the content tree itself
- **AND** the published HTML contains the `note` template output inside the document
