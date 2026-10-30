## ADDED Requirements

### Requirement: Source commit time
Each page with a source file SHALL carry `lastUpdated`: the Unix time in seconds of the last Git commit that touched the source, or `null` when the file is untracked or Git is unavailable. The engine SHALL NOT format the value; templates own its presentation. Repeated lookups of one source within a build SHALL query Git once.

#### Scenario: Commit time reaches the document
- **WHEN** a page source was last committed at 2023-01-02T00:00:00Z
- **THEN** the document handler receives `page.lastUpdated` equal to `1672617600`
