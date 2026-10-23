## REMOVED Requirements

### Requirement: Same config as production, dev-only
**Reason**: Rename an inaccurate heading without changing implemented behavior.
**Migration**: Use the corresponding clarified requirement in this change.

## ADDED Requirements

### Requirement: Generated preview configuration
Serving SHALL use the core nginx generator’s compression, image negotiation and flat-URL rules. It SHALL generate a separate nginx-serve.conf, so hooks that customize the build’s nginx.conf or Apache .htaccess SHALL NOT be assumed to run for serve. The extension requires nginx on PATH and MAY be installed as a devDependency; CI that exercises native serving SHALL install it explicitly.

#### Scenario: Preview uses the core generator
- **WHEN** the site is served locally
- **THEN** its separate runtime configuration uses the core generator’s negotiation and flat-URL rules
- **AND** build-file hooks and arbitrary production settings are not implicitly imported
- **AND** the extension requires `nginx` in `PATH`

