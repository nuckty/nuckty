## ADDED Requirements

### Requirement: External command separator rejection regression

The content-external regression suite SHALL exercise a derived repository name containing a backslash when claiming separator rejection.

#### Scenario: Backslash in repository name

- **WHEN** getRepoName receives a URL whose last component contains a backslash
- **THEN** the regression verifies an unsafe-name error rather than asserting only ordinary URL parsing

