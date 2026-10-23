## ADDED Requirements

### Requirement: Compact branded footer
The footer SHALL have a distinct brand, a consistently aligned navigation row and a separate license label. The page source link SHALL remain in its navigation with a concise visible label. Mobile SHALL keep the brand/license row separate from links without document overflow.

#### Scenario: Reach the footer
- **WHEN** a page ends on phone or desktop
- **THEN** brand, navigation and license have a clear stable hierarchy

### Requirement: Directional neighboring page links
Neighboring links SHALL show the page name and an outward chevron at the corresponding side without visible direction captions. Direction SHALL remain accessible and a missing neighbor SHALL not move the other to the wrong side.

#### Scenario: Continue reading
- **WHEN** a reader reaches the neighboring links
- **THEN** the preceding page is on the left and the following page on the right

