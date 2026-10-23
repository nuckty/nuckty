## REMOVED Requirements

### Requirement: Prepared variants copied next to the original
**Reason**: Rename an inaccurate heading without changing implemented behavior.
**Migration**: Use the corresponding clarified requirement in this change.

## ADDED Requirements

### Requirement: Prepared raster families are copied
The engine SHALL copy prepared raster representations without encoding them. A raster family SHALL have one 16-hex hash derived from its original format and bytes and every available prepared AVIF/WebP representation. Its logical reference is `_i<hash>`; physical files use the format directories (`png`, `jpg`, `avif`, `webp`) or the artifact root for GIF. The standard scan SHALL include PNG, JPEG, GIF, WebP and SVG, not ICO or standalone AVIF. SVG SHALL retain its byte-derived `<hash>.svg` reference. Changing any served representation SHALL change the family reference.

#### Scenario: Variants are copied, not encoded
- **WHEN** a PNG has prepared AVIF and WebP siblings
- **THEN** original and variants are copied under the same family hash
- **AND** changing only a prepared variant changes the logical reference

## MODIFIED Requirements

### Requirement: One address in HTML
HTML SHALL reference one logical raster address `/_i<hash>`. Hosting SHALL select an available AVIF then WebP representation when explicitly allowed by a nonzero q, then fall back to the original. The original fallback SHALL NOT be described as full Accept negotiation or as rejected automatically by an original-format q=0.

#### Scenario: Server negotiates by Accept
- **WHEN** a client requests the logical image reference
- **THEN** explicit nonzero AVIF/WebP acceptance enables those available files in the fixed priority order
- **AND** a client that does not accept modern formats receives the original
