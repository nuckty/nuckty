## ADDED Requirements

### Requirement: Consistent beta1 source candidate
The first-party source candidate SHALL identify its packages, extension peer contract, CLI and starter archives as 1.0.0-beta1. The core SHALL include English and Russian changelogs with the exact motto "We call its Beta, coz it's betta then nothin". Preparation SHALL preserve current Git state and SHALL not create commits or publish sources. The approved future publication plan SHALL use one fresh root commit per repository with the exact message "Hello, world!"; existing history is not required in those future main branches.

#### Scenario: Prepare reviewable commits
- **WHEN** the beta1 source candidate is prepared
- **THEN** version references and retained package receipts agree, and local verification and pending remote checks are reported separately

