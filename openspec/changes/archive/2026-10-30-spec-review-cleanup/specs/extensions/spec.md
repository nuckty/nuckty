## MODIFIED Requirements

### Requirement: levels entry point
`env.levels` SHALL provide `add(dir)`, adding the extension's `blocks/` dir as a level. The engine loads blocks from it by deps, and a site can override them by placing its version on a later level. Block modules SHALL NOT receive `env`. Each `.nu.ts` module SHALL export default `templates()`, import `block` from `@nuckty/core`, and declare only its own block.

#### Scenario: Block extension adds a level
- **WHEN** an extension imports fileURLToPath from node:url and calls `env.levels.add(fileURLToPath(new URL('./blocks/', import.meta.url)))`
- **THEN** its blocks are loadable by deps alongside the site's blocks
- **AND** a later site level overrides them

### Requirement: Independent extension environments
Each NucktyEnv instance SHALL retain its own command, document, Markdown, level and pending pipeline registrations.

#### Scenario: Registrations stay with their build environment
- **WHEN** an extension registers behavior in one of two independently created environments
- **THEN** the second environment has no corresponding registration, and registering different behavior there does not change the first environment's observable results

### Requirement: External command separator rejection regression
The content-external regression suite SHALL exercise a derived repository name containing a backslash when claiming separator rejection.

#### Scenario: Backslash in repository name
- **WHEN** getRepoName receives a URL whose last component contains a backslash
- **THEN** the regression verifies an unsafe-name error rather than asserting only ordinary URL parsing

### Requirement: Observable startup cancellation fixture
The validator startup cancellation regression SHALL synchronize stop with an observed pending health request rather than a fixed wall-clock delay.

#### Scenario: Stop during readiness request
- **WHEN** the owned validator has entered its pending readiness request and stop is called
- **THEN** validation rejects with the stopped reason and the test verifies owned child termination

### Requirement: Owned preview output destinations
Serve SHALL reject symbolic links in its build directory, preview config, PID and generated log destinations before output access or nginx launch. Symbolic consumer roots SHALL remain supported through their canonical root.

#### Scenario: Linked runtime output
- **WHEN** a preview output destination contains a symbolic link
- **THEN** serve refuses without modifying outside bytes or launching nginx

## REMOVED Requirements

### Requirement: Accurate CI schedule reporting

**Reason**: The workflows in this repository have no cron schedule or cache metrics.

**Migration**: Follow the CI audit requirement in release-audit.

### Requirement: Literal-safe artifact link checks

**Reason**: The artifact link checker belongs to the documentation website and is not part of this repository.

**Migration**: Keep the requirement with the website that implements it.

### Requirement: Complete raw-text regions in artifact checks

**Reason**: The artifact link and gallery checkers belong to the documentation website and are not part of this repository.

**Migration**: Keep the requirement with the website that implements it.

### Requirement: Explicit snapshot repository names

**Reason**: The snapshot tooling belongs to the documentation website and is not part of this repository.

**Migration**: Keep the requirement with the website that implements it.

### Requirement: Complete password hook synthetic configuration

**Reason**: The password hook and its fixture belong to the documentation website and are not part of this repository.

**Migration**: Keep the requirement with the website that implements it.

### Requirement: Verified dependency audit remediation

**Reason**: The requirement records a review procedure, not a contract of the extension API; CI audits lockfiles under release-audit "CI dependency and action integrity".

**Migration**: Follow the CI audit requirement in release-audit.
