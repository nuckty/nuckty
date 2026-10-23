## MODIFIED Requirements

### Requirement: Artifact and validation integrity
Deployment SHALL validate local manifest content hashes before connecting and before committing a manifest. Validation SHALL reject an occupied daemon port before spawning.

#### Scenario: Stale same-size artifact
- **WHEN** a file differs from its manifest hash with unchanged size
- **THEN** deployment fails before opening a transport.

#### Scenario: Foreign HTTP validator
- **WHEN** the configured validator port is occupied
- **THEN** validation fails without accepting that service response.

