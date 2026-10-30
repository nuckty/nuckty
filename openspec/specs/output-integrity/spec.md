# output-integrity Specification

## Purpose
Preserve authored values and output integrity across rendering, routing, assets and image conversion.

## Requirements

### Requirement: CSS image reference integrity
CSS image rewriting SHALL retain query and fragment suffixes. SVG inlining SHALL encode apostrophes for CSS strings and only inline local hashed SVG references without suffixes.

#### Scenario: SVG apostrophe
- **WHEN** an SVG contains single-quoted XML attributes or an apostrophe in text
- **THEN** the emitted data URL remains valid CSS and decodes to the original SVG.

#### Scenario: Fragment or external reference
- **WHEN** an SVG URL names a fragment or an external origin
- **THEN** inlining preserves the reference rather than discarding its selector or origin.

### Requirement: Explicit selector and target identity
Template matching SHALL use only own modifier keys and support wildcard elements combined with element modifiers. Resolved target names SHALL come from target configuration keys.

#### Scenario: Missing modifier
- **WHEN** a modifier name exists only on the object prototype
- **THEN** its conditional template does not apply.

#### Scenario: Wildcard element
- **WHEN** an element has the requested own element modifier and a selector targets every element
- **THEN** the selector applies.

#### Scenario: Target data name
- **WHEN** a target value also contains a name property
- **THEN** its resolved name remains its targets map key.

### Requirement: Enumerated hidden attribute
Both HTML serializers SHALL preserve explicit string values of the enumerated hidden attribute, while hidden true remains a bare attribute and false remains absent.

#### Scenario: Hidden until found
- **WHEN** a node sets hidden to until-found
- **THEN** its serialized attribute retains until-found.

### Requirement: Reachable page routes
The HTML stage SHALL reject page URLs reserved by generated hosting rules or artifact directory roots before writing pages. Ordinary queries SHALL NOT trigger Apache direct HTML denial.

#### Scenario: A page collides with static routing
- **WHEN** a page URL ends in a supported static extension, equals an artifact directory root or a reserved technical URL, is a negotiated image URL `/_i<hex>`, or enters a compression directory
- **THEN** the build fails with that URL before any HTML page is written
- **AND** unreserved dotted routes such as /release/1.0.0 remain valid

#### Scenario: A query mentions an HTML filename
- **WHEN** /?download=guide.html is requested
- **THEN** the root page is served normally
- **AND** a direct path /guide.html is still refused

### Requirement: Authored inline text spacing
The Markdown bridge SHALL preserve parsed text whitespace around inline HTML and links without inserting or removing spaces.

#### Scenario: Inline HTML separates words
- **WHEN** Markdown contains Hello followed by a space and an inline em element containing world
- **THEN** the rendered text remains Hello world
- **AND** a trailing space inside an inline span is retained

#### Scenario: An adjacent link has no authored space
- **WHEN** text is immediately followed by a Markdown link
- **THEN** no extra space is inserted before that link

### Requirement: Filesystem names survive CSS import generation
CSS imports SHALL escape filesystem quote, backslash and newline characters rather than creating invalid CSS strings.

#### Scenario: Quoted project path
- **WHEN** a block stylesheet is read from a project directory containing a quote or backslash
- **THEN** its rules are bundled successfully

### Requirement: Failed variant deletion remains a failed conversion
The image command SHALL ignore only ENOENT when removing an obsolete variant.

#### Scenario: Destination is a directory
- **WHEN** a non-winning variant cannot replace or remove its destination
- **THEN** the command returns nonzero and retains an incomplete cache entry that is retried
