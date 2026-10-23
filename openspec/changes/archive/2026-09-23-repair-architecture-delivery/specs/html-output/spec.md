## MODIFIED Requirements

### Requirement: Document wrapper minimization
With `document: true`, the serializer SHALL prepend lowercase `<!doctype html>` and append two newline characters. Without document mode it SHALL add neither. Wrapper nodes SHALL come from the supplied resolved tree: explicit `<html>`, `<head>` and `<body>` opening tags SHALL be retained, and a tree that intentionally omits an optional head wrapper SHALL not acquire one. For a conforming document tree, optional closing `</html>`, `</head>` and `</body>` tags SHALL be omitted. The serializer SHALL add no indentation; literal text and raw content MAY contain newlines.

#### Scenario: Optional wrapper tags are omitted
- **WHEN** a conforming document tree contains explicit html, head and body nodes and document mode is enabled
- **THEN** their opening tags are retained and their optional closing tags are absent
- **AND** the output begins with `<!doctype html>` and ends with two newline characters

#### Scenario: Fragment rendering has no document envelope
- **WHEN** the same tree is rendered without document mode
- **THEN** no doctype or trailing service newlines are added

### Requirement: Void elements and boolean attributes
HTML void elements SHALL be emitted as `<name attrs>` without a slash or end tag: `area, base, br, col, embed, hr, img, input, link, meta, param, source, track, wbr`. Empty SVG shapes (`path`, `circle`, `ellipse`, `line`, `polygon`, `polyline`, `rect`, `use`, `stop`) SHALL use `/>` inside SVG. `foreignObject` SHALL restore HTML serialization for its descendants, and a nested svg SHALL re-enter SVG serialization. Boolean attributes (`muted`, `autoplay`, `playsinline`, `async`, `defer`, `hidden`, `disabled`, `checked`, `selected`, and the supported HTML boolean set) SHALL be emitted by name without a value when present; null, undefined and false attribute values SHALL be omitted.

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

#### Scenario: Logical values survive encoding
- **WHEN** an attribute or data-bem string includes `>`, `<`, ampersand or quotation marks
- **THEN** its HTML-decoded value equals the original value without additional attributes
- **AND** parsing the decoded data-bem JSON preserves the original object

#### Scenario: BEM class suppression is explicit
- **WHEN** a node has only mix classes
- **THEN** those classes are emitted
- **AND** setting `bem:false` suppresses BEM and mix classes and data-bem, while preserving explicit `cls`

### Requirement: Closing-tag omission
Closing-tag omission SHALL preserve the intended parent and sibling relationships of a conforming HTML tree. Non-tight ul/ol lists SHALL retain every li end tag. Article lists (`block: 'article', elem: 'list'`) SHALL omit li end tags only before another li and retain the trailing end tag. Other lists explicitly marked `tightList:true` SHALL omit li end tags before another li and at the end of the list, retaining them before script, text, raw or other siblings. Nested arrays and tag-false fragments SHALL participate in sibling lookahead without adding a wrapper. List policy SHALL belong to the immediate list parent. Paragraphs SHALL retain explicit end tags. Optional table cell, row and section end tags MAY be omitted where HTML parsing preserves the intended conforming table tree; non-optional end tags SHALL remain.

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

### Requirement: Block-level element set
A paragraph SHALL retain its explicit `</p>` before a block-level sibling and at the end of its parent. The serializer SHALL NOT infer paragraph end-tag omission from a block-level element set. This preserves the established output layout while keeping paragraph boundaries explicit.

#### Scenario: Block-level set governs p omission
- **WHEN** a p is followed by a div, heading, list, table or another block-level sibling
- **THEN** the explicit p closing tag is retained
- **AND** a trailing paragraph also retains its closing tag

### Requirement: Whitespace and comments
The serializer SHALL add no indentation or separators between adjacent structural nodes. It SHALL preserve literal whitespace supplied in text and attribute values, including whitespace-only text between elements and meaningful whitespace inside pre/code. Text escaping MAY change the encoded bytes but SHALL preserve the logical text. Trusted raw content, including HTML comments and newlines, SHALL pass through unchanged; the serializer SHALL NOT run a blanket whitespace or comment-removal pass. Document-mode trailing newlines are the explicit exception defined by Document wrapper minimization.

#### Scenario: Inter-element whitespace removed, pre preserved
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
