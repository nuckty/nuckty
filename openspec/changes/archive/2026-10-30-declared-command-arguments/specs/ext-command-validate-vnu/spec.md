## REMOVED Requirements

### Requirement: Unknown option presence

**Reason**: The core CLI rejects undeclared options, including an empty key, for every command.

**Migration**: Commands declare their options in `env.commands.add`.
