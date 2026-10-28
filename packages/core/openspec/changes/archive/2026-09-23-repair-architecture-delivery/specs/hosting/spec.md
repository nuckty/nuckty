## MODIFIED Requirements

### Requirement: Caching headers
Both generated configs SHALL serve hashed CSS/JS and logical image references with long-lived immutable caching and HTML with no-cache. Identity and negotiated compressed variants of the same hashed resource SHALL retain that immutable policy. Responses that vary by encoding or image format SHALL carry the relevant Vary header.

#### Scenario: Caching matches asset type
- **WHEN** a hashed asset is served in identity and compressed forms
- **THEN** both forms carry immutable caching
- **AND** an HTML page remains revalidated with no-cache

### Requirement: No content redirects in core
The generated configs SHALL contain technical routing, negotiation, caching and security rules only. Consumer redirects MAY be added through a registered `after('htaccess', ...)` finalization hook after `.htaccess` generation and before the manifest; the core SHALL not embed site-specific redirect destinations.

#### Scenario: Redirects are an extension concern
- **WHEN** a consumer registers a content redirect hook
- **THEN** the final `.htaccess` contains its redirects
- **AND** the manifest hashes that final customized file
