## MODIFIED Requirements

### Requirement: Lazy loading is content logic
Image loading policy SHALL belong to the block or Markdown extension, not the core image-copy stage. The gallery extension SHALL leave the first image in each gallery eager and mark subsequent images lazy. This local ordering SHALL NOT imply that the image is above the fold or the first image on the entire page.

#### Scenario: First image is eager, rest lazy
- **WHEN** a gallery renders several images
- **THEN** the first has no `loading=lazy` and the rest do
- **AND** the choice is made per gallery, not from page position or viewport visibility

