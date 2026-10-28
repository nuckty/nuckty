## ADDED Requirements

### Requirement: SEO artifact ownership
The core SHALL copy a supplied robots.txt from the target configuration directory into the output root. It SHALL NOT invent that file when absent or generate an SEO sitemap.xml. A consumer MAY emit an XML sitemap through a pipeline extension before finalization, allowing the normal compression and manifest stages to process it.

#### Scenario: Consumer supplies robots.txt
- **WHEN** the target configuration directory contains robots.txt
- **THEN** the assets stage copies its bytes unchanged into the output root

#### Scenario: Consumer supplies no SEO artifacts
- **WHEN** robots.txt is absent and no extension emits sitemap.xml
- **THEN** the build creates neither SEO file automatically

### Requirement: Current implementation references
Public API and source documentation SHALL describe the implemented configuration, metadata, artifact ownership and lifecycle boundaries. It SHALL distinguish standalone directory discovery from explicit build roots, first-target command defaults from an all-target build, and read-only preparation plans from commands that read remote state. Historical migration notes SHALL NOT replace the current contract.

#### Scenario: Developer reads implementation documentation
- **WHEN** a developer reads a public type or stage/extension description
- **THEN** its documented inputs, side effects and conditions agree with the current implementation and associated user guide
