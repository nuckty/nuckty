## MODIFIED Requirements

### Requirement: Empty string modifier naming parity
Class generation SHALL retain the modifier value delimiter for empty string values, for the node's own modifiers and for mixed entities alike. Only boolean true SHALL use valueless modifier naming.

#### Scenario: Empty string value
- **WHEN** a block or element modifier has an empty string value
- **THEN** its class ends with the modifier name followed by the value delimiter
