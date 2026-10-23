## ADDED Requirements

### Requirement: Gallery checker container scope
Artifact gallery validation SHALL apply eager-first and lazy-rest policy independently within each gallery container. Multiple valid galleries SHALL NOT be rejected as one global image list. A lazy first image or eager later image in any container SHALL be reported. Standalone image fragments used by existing tests SHALL retain their validation behavior, and unrelated or literal image-shaped text SHALL NOT affect a container's loading policy.

#### Scenario: Two valid galleries
- **WHEN** each gallery has an eager first image and lazy later images
- **THEN** validation accepts both containers

#### Scenario: A later container violates the policy
- **WHEN** a second gallery has a lazy first image or an eager later image
- **THEN** validation reports that violation rather than accepting it based on the first container
