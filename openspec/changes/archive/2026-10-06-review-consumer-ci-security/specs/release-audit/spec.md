## ADDED Requirements

### Requirement: Consumer CI dependency and action integrity
Consumer workflows SHALL reference third-party actions by full commit SHA, grant only read repository-content permissions, and disable checkout credential persistence. Consumer bootstrap SHALL audit full lockfiles of prepared packages after installation and before building, and audit the installed consumer. Audits SHALL use the public registry and reject low-or-higher findings or registry errors. These gates SHALL preserve the existing tested-artifact deployment sequence and event restrictions.

#### Scenario: Prepared source audit fails
- **WHEN** a prepared package audit fails
- **THEN** its build and all later installation/build actions are not run

#### Scenario: Consumer sources are installed
- **WHEN** bootstrap processes valid prepared packages
- **THEN** each package is audited before its build and the installed consumer is audited too

#### Scenario: Workflow credentials and dependencies
- **WHEN** a consumer workflow is read
- **THEN** its action refs are immutable and checkout does not persist credentials in the workspace

