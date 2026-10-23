## MODIFIED Requirements

### Requirement: One render mode
The serializer SHALL use one minimization mode in development and production. Identical resolved input and options SHALL produce identical output regardless of the calling environment. It SHALL offer no pretty-HTML development mode. Validity depends on the authored tree; debugging MAY inspect output: bemjson with an explicit Templates collection.

#### Scenario: dev equals prod
- **WHEN** identical resolved input is serialized with identical options in development and production
- **THEN** the HTML is identical byte-for-byte
- **AND** there is no formatted-HTML dev mode
