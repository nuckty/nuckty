## MODIFIED Requirements

### Requirement: Document wrapper minimization
With `document: true`, the serializer SHALL prepend lowercase `<!doctype html>` and append two newline characters. Without document mode it SHALL add neither. Wrapper nodes SHALL come from the supplied resolved tree: explicit `<html>` and `<body>` opening tags SHALL be retained; an HTML `<head>` opening tag under html SHALL be omitted only when it has no emitted attributes and is empty or begins with an element after fragment flattening, and a tree that intentionally omits an optional head wrapper SHALL not acquire one. For a conforming document tree, optional closing `</html>`, `</head>` and `</body>` tags MAY be omitted where that preserves the intended structure; required end tags SHALL remain before opaque raw or literal-text siblings. The serializer SHALL add no indentation; literal text and raw content MAY contain newlines.

#### Scenario: Optional wrapper tags are omitted
- **WHEN** a conforming document tree contains explicit html, head and body nodes and document mode is enabled
- **THEN** html/body opening tags are retained, an eligible head opening tag is omitted, and their optional closing tags are absent when no following literal sibling requires them
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
