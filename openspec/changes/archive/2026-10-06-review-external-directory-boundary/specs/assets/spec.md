## ADDED Requirements

### Requirement: External repository directory boundary
Captured external repository configuration SHALL reject empty, dot, dot-dot, backslash-containing or control-character directory names before output cleanup or resource copying. Ordinary repository URLs and absent-list discovery SHALL retain their behavior. Diagnostics SHALL NOT disclose URL credentials or query values.

#### Scenario: Traversal repository name
- **WHEN** external configuration derives dot-dot as a repository directory name
- **THEN** build fails before cleanup and does not publish project-root files
