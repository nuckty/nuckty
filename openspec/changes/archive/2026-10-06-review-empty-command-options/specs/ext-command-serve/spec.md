## ADDED Requirements

### Requirement: Unknown option presence
The command SHALL reject every unsupported option key, including an empty key, before accessing cwd or invoking filesystem/runtime operations. Supported argument behavior SHALL remain unchanged.

#### Scenario: Empty unknown key
- **WHEN** flags contains an unsupported empty-string key
- **THEN** the command reports an option error before cwd access
