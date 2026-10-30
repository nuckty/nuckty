# nuckty — images spec (1.0.0)

## Purpose

Specify prepared image families copied by the build. Standard HTML uses one logical raster URL; hosting serves an available AVIF or WebP representation that the request explicitly accepts, else the original. The build does not encode variants; conversion is a separate command. This standard output does not require a picture/source wrapper or a CDN.

## Requirements

### Requirement: Prepared raster families are copied
The engine SHALL copy prepared raster representations without encoding them. A raster family SHALL have one 16-hex hash derived from its original format and bytes and every available prepared AVIF/WebP representation. Its logical reference is `_i<hash>`; physical files use the format directories (`png`, `jpg`, `avif`, `webp`) or the artifact root for GIF. The standard scan SHALL include PNG, JPEG, GIF, WebP and SVG, not ICO or standalone AVIF. SVG SHALL retain its byte-derived `<hash>.svg` reference. Changing any served representation SHALL change the family reference.

#### Scenario: Variants are copied, not encoded
- **WHEN** a PNG has prepared AVIF and WebP siblings
- **THEN** original and variants are copied under the same family hash
- **AND** changing only a prepared variant changes the logical reference

### Requirement: One address in HTML
HTML SHALL reference one logical raster address `/_i<hash>`. Hosting SHALL select an available AVIF then WebP representation when explicitly allowed by a nonzero q, then fall back to the original. The original fallback SHALL NOT be described as full Accept negotiation or as rejected automatically by an original-format q=0.

#### Scenario: Server negotiates by Accept
- **WHEN** a client requests the logical image reference
- **THEN** explicit nonzero AVIF/WebP acceptance enables those available files in the fixed priority order
- **AND** a client that does not accept modern formats receives the original

### Requirement: Shared image-mapping.json
The build SHALL share a mapping from source-relative image paths to logical hashed references between Markdown and CSS. Exact normalized paths SHALL precede basename fallbacks; an ambiguous fallback SHALL fail instead of choosing by insertion order. Later configured levels SHALL deterministically override the same source-relative name.

#### Scenario: Markdown and CSS share the mapping
- **WHEN** two directories contain an image with the same basename
- **THEN** an exact path selects its corresponding image regardless of mapping order
- **AND** an ambiguous basename-only request fails clearly

### Requirement: Lazy loading is content logic
Image loading policy SHALL belong to the block or Markdown extension, not the core image-copy stage. The gallery extension SHALL leave the first image in each gallery eager and mark subsequent images lazy. This local ordering SHALL NOT imply that the image is above the fold or the first image on the entire page.

#### Scenario: First image is eager, rest lazy
- **WHEN** a gallery renders several images
- **THEN** the first has no `loading=lazy` and the rest do
- **AND** the choice is made per gallery, not from page position or viewport visibility

### Requirement: Image sources outside tooling directories
The images stage SHALL skip hidden directories and `node_modules` on every level, as the assets stage does.

#### Scenario: Dependency images are not published
- **WHEN** a level contains `node_modules/pkg/x.png` and `.venv/y.png`
- **THEN** neither image appears in the image mapping or the artifact
