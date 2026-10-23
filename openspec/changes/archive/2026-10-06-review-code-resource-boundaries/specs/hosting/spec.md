## ADDED Requirements

### Requirement: Hosting artifact destination ownership
The htaccess writer SHALL reject symbolic-link destinations before writing generated hosting configuration. Files outside the artifact root SHALL remain unchanged. Normal generated hosting output SHALL retain its existing behavior.

#### Scenario: Linked htaccess destination
- **WHEN** outDir/.htaccess is a symbolic link to a file outside output
- **THEN** the stage fails before modifying the linked file

### Requirement: Build hosting config write ownership
The nginx config writer SHALL reject a linked nginx.conf destination before modifying outside bytes. A symbolic build directory selecting an owned real workspace SHALL remain supported.

#### Scenario: Linked nginx configuration
- **WHEN** buildDir/nginx.conf points to an outside file
- **THEN** writing fails and outside bytes are preserved

#### Scenario: Symbolic build workspace
- **WHEN** buildDir points to an owned workspace and nginx.conf is a regular destination
- **THEN** the writer emits configuration in that real workspace
