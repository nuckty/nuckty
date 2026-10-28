## ADDED Requirements

### Requirement: Own bundle dependency keys
Bundle dependency dictionaries SHALL retain every configured bundle as an own enumerable key, including names equal to object prototype properties. These names SHALL NOT alter dictionary prototypes or silently drop resource inputs.

#### Scenario: Prototype-like bundle name
- **WHEN** a declared bundle is named __proto__ and contains real CSS and JavaScript dependencies
- **THEN** both resources are built and retained in their hash maps

### Requirement: Real Markdown source containment
Before reading a Markdown source, the core SHALL require both its lexical path and resolved real path to remain within the selected content root. A symlink outside that root SHALL fail without emitting its content. Explicit symlink content roots and file symlinks remaining inside the resolved root SHALL stay supported. Logical paths SHALL continue to drive source-relative links.

#### Scenario: Source symlink escapes its root
- **WHEN** a sitemap source points through a symlink to a file outside the selected content root
- **THEN** the build fails before reading or emitting that file

#### Scenario: Symlink stays inside the selected root
- **WHEN** an explicit content root is a symlink or a source links to another file within the resolved root
- **THEN** the page is built without treating that permitted alias as an escape

### Requirement: Image family source realpath ownership
Image originals and prepared variant reads SHALL remain inside the real source level selected for that image. Outside aliases SHALL fail before reading or publishing their bytes. Symbolic source roots and aliases to variants inside that real root SHALL remain supported.

#### Scenario: Outside variant alias
- **WHEN** a WebP or AVIF sibling resolves outside its selected image level
- **THEN** the stage fails before reading that file and publishing the image family

#### Scenario: Inside variant alias
- **WHEN** a symbolic source root contains a variant alias to another file within its real root
- **THEN** the representation remains supported
