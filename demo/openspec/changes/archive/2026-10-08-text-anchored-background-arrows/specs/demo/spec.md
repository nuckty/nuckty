## ADDED Requirements

### Requirement: Text-anchored broad neighboring arrows
Background chevrons SHALL be three times their previous visible width, keep their height and start at the corresponding page-name block. They SHALL remain behind the text without occupying layout space.

#### Scenario: Read neighboring links
- **WHEN** the names are visible
- **THEN** each background arrow begins at its name and uses the widened geometry

### Requirement: Unruled ending navigation
The neighboring links and footer SHALL have no top horizontal separator.

#### Scenario: Reach the page ending
- **WHEN** neighboring links and footer are visible
- **THEN** neither has a horizontal rule above it

### Requirement: Bottom-aligned footer navigation
The right footer navigation SHALL align its bottom edge with the left identity block.

#### Scenario: Reach the footer
- **WHEN** both footer columns are visible
- **THEN** their bottom edges align

### Requirement: Larger fluid reading text
Main reading text SHALL grow continuously from 17px at 320px viewport width to 20px at 1280px, bounded at those sizes.

#### Scenario: Resize the reading page
- **WHEN** the viewport changes from mobile to desktop
- **THEN** main text grows without horizontal page overflow

