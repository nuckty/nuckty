## ADDED Requirements

### Requirement: Mass-deletion guard requires an explicit flag
The deploy-ftp command SHALL stop and suggest `--allow-mass-delete` when the share of files to delete exceeds a threshold (default 30%), to protect against an accidental wipe.

#### Scenario: Large deletion is blocked without --allow-mass-delete
- **WHEN** a deploy would delete more than 30% of remote files
- **THEN** the command stops and points to `--allow-mass-delete`
- **AND** `--allow-mass-delete` proceeds with the deletion

#### Scenario: Force does not lift the guard
- **WHEN** `nuckty deploy-ftp --force` would delete more than 30% of remote files
- **THEN** the command stops before any change and suggests `--allow-mass-delete`

## REMOVED Requirements

### Requirement: Mass-deletion guard

**Reason**: A scenario named and described --force as lifting the guard, contradicting the requirement.

**Migration**: The behavior is specified as "Mass-deletion guard requires an explicit flag".
