## MODIFIED Requirements

### Requirement: Text-anchored broad neighboring arrows
Background chevrons SHALL preserve their original 30 by 84 px path geometry and angle while tripling stroke thickness from 6 to 18 px. They SHALL begin at the page-name block and remain behind text without occupying layout space. Their SVG viewport SHALL contain the full stroke without clipping.

#### Scenario: Read neighboring links
- **WHEN** names are visible
- **THEN** arrows retain their original angle with a triple-thickness stroke

