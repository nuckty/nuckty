## ADDED Requirements

### Requirement: Artifact and validation integrity
Deployment SHALL validate local manifest content hashes before connecting and before committing a manifest. Validation SHALL reject an occupied daemon port before spawning.

#### Scenario: Stale same-size artifact
- **WHEN** a file differs from its manifest hash with unchanged size
- **THEN** deployment fails before opening a transport.

#### Scenario: Foreign HTTP validator
- **WHEN** the configured validator port is occupied
- **THEN** validation fails without accepting that service response.

### Requirement: Preview ownership and supported output
Build cleanup SHALL preserve preview runtime state. Preview SHALL listen on loopback. CSS versions SHALL use the documented packed browser version encoding. Original WebP SHALL remain reachable without an Accept header. Text SHALL be escaped unless explicitly raw, and metadata strings SHALL retain their values. Image lookup SHALL ignore inherited object keys.

#### Scenario: Build during preview
- **WHEN** a build cleans intermediate files while preview owns its PID
- **THEN** PID, runtime config and logs survive and stop can still identify the server.

#### Scenario: WebP original
- **WHEN** a hashed original has only a WebP representation and Accept is absent
- **THEN** both hosting adapters return that original.

### Requirement: Trustworthy release verification
Coverage SHALL retain source line positions and detect unexecuted functions. Release smoke copies SHALL exclude private configs and external symlinks. Public package lockfiles SHALL resolve through the public registry. Preview and VNU CI SHALL require native command integration tests with their respective runtimes.

#### Scenario: Uncalled function
- **WHEN** coverage measures an imported file containing an uncalled function
- **THEN** its executable body is reported uncovered.

#### Scenario: Private sibling input
- **WHEN** a sibling source contains a private FTP config or a symlink
- **THEN** smoke snapshots do not copy its contents.

#### Scenario: Package source map
- **WHEN** a package ships a source map
- **THEN** each referenced source is embedded or present in the tarball.

### Requirement: Bounded sitemap and explicit targets
Sitemap processing SHALL bound concurrent page reads, Markdown processing and timestamp queries to eight workers and settle started work before returning a failure. Target selection SHALL reject inherited keys and empty target sets. Alternates SHALL exclude siblings in the current language.

#### Scenario: Many pages
- **WHEN** a sitemap contains hundreds of pages
- **THEN** at most eight page timestamp queries are in flight and every successful page retains its timestamp.

#### Scenario: Prototype target
- **WHEN** an undeclared inherited object key is selected as a target
- **THEN** target selection fails as unknown.

### Requirement: Asset selection and video embeds
MP4 assets SHALL use the same explicit collision selection as other assets, and hashing SHALL stream large files. VK embeds SHALL contain distinct owner and video identifiers or retain a complete supported embed URL. Iframes SHALL have a title and lazy loading.

#### Scenario: Colliding video names
- **WHEN** multiple input repositories contain the same MP4 name
- **THEN** the build rejects ambiguity or selects the explicitly configured source.

#### Scenario: VK composite identifier
- **WHEN** an author supplies a signed owner ID and video ID separated by underscore
- **THEN** the iframe URL contains separate oid and id parameters.
