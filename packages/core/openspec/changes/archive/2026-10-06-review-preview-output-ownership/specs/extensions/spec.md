## ADDED Requirements

### Requirement: Owned preview output destinations

Serve SHALL reject symbolic links in its build directory, preview config, PID and generated log destinations before output access or nginx launch. Symbolic consumer roots SHALL remain supported through their canonical root.

#### Scenario: Linked runtime output

- **WHEN** a preview output destination contains a symbolic link
- **THEN** serve refuses without modifying outside bytes or launching nginx
