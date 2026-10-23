## MODIFIED Requirements

### Requirement: Same config as production, dev-only
Serving SHALL use the core nginx generator’s compression, image negotiation and flat-URL rules. It SHALL generate a separate nginx-serve.conf, so hooks that customize the build’s nginx.conf or Apache .htaccess SHALL NOT be assumed to run for serve. The extension requires nginx on PATH and MAY be installed as a devDependency; CI that exercises native serving SHALL install it explicitly.

#### Scenario: Local serve mirrors production
- **WHEN** the site is served locally
- **THEN** it uses the same negotiation and flat-URL rules as production
- **AND** the extension requires `nginx` in `PATH`

