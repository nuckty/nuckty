## ADDED Requirements

### Requirement: Observable startup cancellation fixture

The validator startup cancellation regression SHALL synchronize stop with an observed pending health request rather than a fixed wall-clock delay.

#### Scenario: Stop during readiness request

- **WHEN** the owned validator has entered its pending readiness request and stop is called
- **THEN** validation rejects with the stopped reason and the test verifies owned child termination
