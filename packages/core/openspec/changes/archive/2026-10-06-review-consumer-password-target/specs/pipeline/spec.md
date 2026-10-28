## ADDED Requirements

### Requirement: Consumer password metadata target ownership
The consumer password-title hook SHALL read its optional source from captured target content configuration. It SHALL preserve unrelated page titles and existing absent or invalid source fallback.

#### Scenario: Target differs from global content
- **WHEN** the captured target content root differs from global levels
- **THEN** only the captured target password is prepended

#### Scenario: Configuration changes after capture
- **WHEN** target levels change on disk after configuration capture
- **THEN** the hook retains the captured content root

### Requirement: Optional password source realpath ownership
The password-title hook SHALL not read a password source resolving outside its captured content root. It SHALL preserve supported symbolic content roots and aliases to files inside that root. An outside alias SHALL leave the optional title unchanged.

#### Scenario: Outside source alias
- **WHEN** common/password.json points outside the selected content root
- **THEN** its bytes are not read into the public title

#### Scenario: Inside source alias
- **WHEN** common/password.json points to a file inside the real content root
- **THEN** the optional source remains supported
