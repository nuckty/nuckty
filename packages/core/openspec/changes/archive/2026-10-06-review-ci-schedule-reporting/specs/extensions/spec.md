## ADDED Requirements

### Requirement: Accurate CI schedule reporting

CI schedule comments SHALL describe day-of-month steps accurately. Cache metrics SHALL NOT predict the next execution from a fixed elapsed-day interval when the configured cron does not provide it.

#### Scenario: Monthly step schedule

- **WHEN** cron selects every fifth or sixth day-of-month value
- **THEN** comments explain its monthly reset and metrics omit unsupported next-run predictions
