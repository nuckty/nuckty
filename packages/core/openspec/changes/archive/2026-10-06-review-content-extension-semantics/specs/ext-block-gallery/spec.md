## MODIFIED Requirements

### Requirement: Grid, lightbox, lazy loading
The gallery block SHALL lay images out as a responsive CSS grid; a click SHALL open a full-size view in the nearest gallery’s lightbox, without external JavaScript libraries. All gallery images except the first SHALL get loading=lazy. The first image is local to each gallery; viewport visibility SHALL NOT be inferred. The optional data-group value SHALL remain available for consumers but SHALL NOT be described as controlling built-in runtime navigation or grouping.

#### Scenario: Gallery behavior
- **WHEN** a gallery renders several images
- **THEN** they lay out as a grid and clicking an item opens that gallery’s built-in lightbox
- **AND** every image except the first carries loading=lazy
