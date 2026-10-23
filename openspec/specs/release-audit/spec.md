# release-audit Specification

## Purpose
Specify artifact integrity, bounded processing, safe preview ownership, asset selection and trustworthy package verification across the Nuckty core and extensions. These source invariants do not certify remote deployment or release approval.

## Requirements

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
Coverage SHALL retain source line positions and detect unexecuted functions. Release smoke copies SHALL exclude private configs and external symlinks. Public package lockfiles SHALL resolve through the public registry. Preview and VNU CI SHALL require native command integration tests with their respective runtimes. Package and demo CI SHALL audit full lockfiles against the public registry, including development dependencies, and fail on any vulnerability of low or greater severity or an audit error.

#### Scenario: Uncalled function
- **WHEN** coverage measures an imported file containing an uncalled function
- **THEN** its executable body is reported uncovered.

#### Scenario: Private sibling input
- **WHEN** a sibling source contains a private FTP config or a symlink
- **THEN** smoke snapshots do not copy its contents.

#### Scenario: Package source map
- **WHEN** a package ships a source map
- **THEN** each referenced source is embedded or present in the tarball.

#### Scenario: Vulnerable build dependency
- **WHEN** audit reports a vulnerable build-only dependency or fails to obtain a registry response
- **THEN** CI fails instead of treating production-only results as complete.

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

### Requirement: Consumer XML sitemap integrity
The consumer XML sitemap extension SHALL preserve valid page URL text through XML escaping, derive origin and source paths from the current target snapshot, and bound simultaneous source timestamp queries to eight workers. It SHALL retain sitemap entry order and settle started metadata work before publishing the completed XML. Repeated source paths within the hook SHALL reuse timestamp results.

#### Scenario: Route contains an ampersand
- **WHEN** a supported page route contains an ampersand
- **THEN** the emitted sitemap is well-formed XML and its loc text retains that route

#### Scenario: Targets select distinct origins and content roots
- **WHEN** two targets use different configuration directories and source files
- **THEN** each XML sitemap contains only its own origin and source timestamps
- **AND** changing configuration files after capture does not substitute a different origin or source root

#### Scenario: Many XML entries
- **WHEN** the XML sitemap contains many source-backed entries
- **THEN** at most eight timestamp queries are in flight and all entries retain their source metadata in sitemap order

### Requirement: Consumer CI dependency and action integrity
Consumer workflows SHALL reference third-party actions by full commit SHA, grant only read repository-content permissions, and disable checkout credential persistence. Consumer bootstrap SHALL audit full lockfiles of prepared packages after installation and before building, and audit the installed consumer. Audits SHALL use the public registry and reject low-or-higher findings or registry errors. These gates SHALL preserve the existing tested-artifact deployment sequence and event restrictions.

#### Scenario: Prepared source audit fails
- **WHEN** a prepared package audit fails
- **THEN** its build and all later installation/build actions are not run

#### Scenario: Consumer sources are installed
- **WHEN** bootstrap processes valid prepared packages
- **THEN** each package is audited before its build and the installed consumer is audited too

#### Scenario: Workflow credentials and dependencies
- **WHEN** a consumer workflow is read
- **THEN** its action refs are immutable and checkout does not persist credentials in the workspace

#### Scenario: Local source nested in a pinned checkout
- **WHEN** a consumer file dependency points to a package inside another source checkout
- **THEN** the owner commit supplies its source without requiring a separate repository ref or replacing the nested directory
- **AND** bootstrap checks its package name and real containment before npm operations
- **AND** packages with build scripts retain full installation, audit and build, while unscripted nested source remains covered by owner and consumer dependency audits

### Requirement: Coverage output ownership
Coverage filtering SHALL validate resolved input/output ownership before recursive output cleanup. It SHALL reject output paths containing the input or project root, paths overlapping protected project directories, and existing outputs containing non-report files or symlinks. Valid dedicated report directories SHALL remain reusable, with stale owned reports removed before new reports are written. A rejected request SHALL preserve all existing inputs and source files.

#### Scenario: Output aliases project or input data
- **WHEN** output is the project root, an ancestor of the input, or a symlink alias to an input/protected path
- **THEN** filtering fails before cleanup and preserves source and input bytes

#### Scenario: Output contains unrelated content
- **WHEN** an existing output directory contains non-coverage files
- **THEN** filtering refuses to remove them

#### Scenario: Dedicated output is reused
- **WHEN** an existing output contains only regular coverage reports
- **THEN** filtering replaces stale reports and retains the selected source-range data

### Requirement: Gallery checker container scope
Artifact gallery validation SHALL apply eager-first and lazy-rest policy independently within each gallery container. Multiple valid galleries SHALL NOT be rejected as one global image list. A lazy first image or eager later image in any container SHALL be reported. Standalone image fragments used by existing tests SHALL retain their validation behavior, and unrelated or literal image-shaped text SHALL NOT affect a container's loading policy.

#### Scenario: Two valid galleries
- **WHEN** each gallery has an eager first image and lazy later images
- **THEN** validation accepts both containers

#### Scenario: A later container violates the policy
- **WHEN** a second gallery has a lazy first image or an eager later image
- **THEN** validation reports that violation rather than accepting it based on the first container

### Requirement: Consistent beta1 source candidate
The first-party source candidate SHALL identify its packages, extension peer contract, CLI and starter archives as 1.0.0-beta1. The core SHALL include English and Russian changelogs with the exact motto "We call its Beta, coz it's betta then nothin". Preparation SHALL preserve current Git state and SHALL not create commits or publish sources. The approved future publication plan SHALL use one fresh root commit per repository with the exact message "Hello, world!"; existing history is not required in those future main branches.

#### Scenario: Prepare reviewable commits
- **WHEN** the beta1 source candidate is prepared
- **THEN** version references and retained package receipts agree, and local verification and pending remote checks are reported separately
