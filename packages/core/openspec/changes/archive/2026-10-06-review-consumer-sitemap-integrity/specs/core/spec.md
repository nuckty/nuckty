## ADDED Requirements

### Requirement: Public target snapshot access for extensions
The core SHALL export getBuildConfig and BuildConfigSnapshot so a pipeline extension can access the captured target configuration through its BuildContext. The helper SHALL reuse the current context snapshot when present and resolve the explicit context root and configDir when absent. Snapshot fields SHALL include merged site settings, ordered levels, contentDir, contentRelative and externalUrls.

#### Scenario: Extension reads configuration after capture
- **WHEN** an extension calls getBuildConfig(ctx) after target configuration was captured
- **THEN** it receives that target's snapshot instead of rereading changed files or the global configuration

### Requirement: Public consumer artifact path checks
The package SHALL export assertArtifactPath for consumer writers. XML sitemap and hosting-redirect hooks SHALL check their output destinations before reading or writing, rejecting linked files and intermediate directories without modifying outside bytes.

#### Scenario: Linked consumer output
- **WHEN** XML or hosting-redirect output follows a symbolic link outside the artifact
- **THEN** the hook fails before reading or changing that outside file

#### Scenario: Ordinary consumer output
- **WHEN** destinations are owned regular artifact paths
- **THEN** current generation and redirect behavior remain unchanged
