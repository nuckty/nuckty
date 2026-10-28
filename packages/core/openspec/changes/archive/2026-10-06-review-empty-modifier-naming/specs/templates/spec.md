## ADDED Requirements

### Requirement: Empty string modifier naming parity

stringifyEntity SHALL retain the modifier value delimiter for empty string values, consistent with classify and mixed entities. Only boolean true SHALL use valueless modifier naming.

#### Scenario: Empty string value

- **WHEN** a block or element modifier has an empty string value
- **THEN** both naming helpers produce the same modifier token including the value delimiter for the configured preset
