## MODIFIED Requirements

### Requirement: Persistent HTTP daemon, parallel, cached
One validator instance SHALL start its own vnu.jar process lazily, validate files with bounded concurrent HTTP requests and cache results by file content while that instance lives. The command SHALL stop and await its owned process when its validation run ends, including after a failure. Spawn failure, premature child exit, timeout and malformed protocol response SHALL fail the run. A worker failure SHALL stop scheduling new files and wait for in-flight work before cleanup.

#### Scenario: Process is reused within a validation run
- **WHEN** one validator instance checks several pages and validates unchanged input again
- **THEN** it can reuse its owned process and cached result during that run
- **AND** completion stops and awaits the process

#### Scenario: Failure is not reported as a valid page
- **WHEN** startup, HTTP protocol or one worker fails
- **THEN** the command reports failure rather than an empty valid result
- **AND** no later work is scheduled after failure while in-flight work settles
