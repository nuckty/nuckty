## ADDED Requirements

### Requirement: Explicit consumer root for resource stages
Every core build stage SHALL resolve relative configured levels and external repositories against BuildContext.cwd. It SHALL NOT replace that root with an ancestor discovered from package.json. This SHALL apply consistently to images, static files, CSS and JavaScript, including a nested consumer using dependencies installed in a parent package. Standalone directory-discovery helpers SHALL retain their documented behavior.

#### Scenario: Nested consumer excludes parent-shadow resources
- **WHEN** a parent package and nested consumer provide different files under matching relative level and external-repository names
- **THEN** the nested build emits only the consumer’s declared resources
- **AND** adding or removing a consumer package.json does not change resource ownership

### Requirement: Build metadata path ownership
Core stages SHALL validate build metadata destinations before reading or writing them, reject symbolic-link files and paths escaping the real build workspace, and preserve supported symbolic build roots. This SHALL cover CSS/JS entry files and hashes, image mapping and diagnostic sitemap output.

#### Scenario: Linked metadata file
- **WHEN** a build metadata path links to an outside file
- **THEN** the stage fails before reading or modifying outside bytes

#### Scenario: Owned symbolic workspace
- **WHEN** buildDir selects an owned real workspace through a symbolic link
- **THEN** ordinary metadata generation remains supported
