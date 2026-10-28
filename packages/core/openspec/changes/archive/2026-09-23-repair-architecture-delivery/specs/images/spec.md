## MODIFIED Requirements

### Requirement: Prepared variants copied next to the original
The engine SHALL copy prepared raster representations without encoding them. A raster family SHALL have one 16-hex hash derived from its original format and bytes and every available prepared AVIF/WebP representation. Its logical reference is `_i<hash>`; physical files use the format directories (`png`, `jpg`, `avif`, `webp`) or the existing GIF/ICO location. SVG SHALL retain its byte-derived `<hash>.svg` reference. Changing any served representation SHALL change the family reference.

#### Scenario: Variants are copied, not encoded
- **WHEN** a PNG has prepared AVIF and WebP siblings
- **THEN** original and variants are copied under the same family hash
- **AND** changing only a prepared variant changes the logical reference

### Requirement: One address in HTML
HTML SHALL reference one logical raster address `/_i<hash>`. Hosting SHALL select an acceptable available AVIF or WebP representation, falling back to the original. Explicit quality zero SHALL exclude that representation.

#### Scenario: Server negotiates by Accept
- **WHEN** a client requests the logical image reference
- **THEN** only acceptable available representations are selected
- **AND** a client that does not accept modern formats receives the original

### Requirement: Shared image-mapping.json
The build SHALL share a mapping from source-relative image paths to logical hashed references between Markdown and CSS. Exact normalized paths SHALL precede basename fallbacks; an ambiguous fallback SHALL fail instead of choosing by insertion order. Later configured levels SHALL deterministically override the same source-relative name.

#### Scenario: Markdown and CSS share the mapping
- **WHEN** two directories contain an image with the same basename
- **THEN** an exact path selects its corresponding image regardless of mapping order
- **AND** an ambiguous basename-only request fails clearly
