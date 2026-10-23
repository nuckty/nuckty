## ADDED Requirements

### Requirement: Horizontal spacing converges without changing line boundaries
Supported em-dash prose patterns SHALL converge to one NBSP before the existing dash and one ordinary space after it, including repeated spaces, tabs or NBSP already present. The transform SHALL retain line breaks and a dialogue dash at the start of a line. It SHALL retain established non-matching patterns such as an unspaced numeric range. Markdown link spacing SHALL remain authored, and code/raw literal contexts SHALL remain untouched.

#### Scenario: Existing NBSP and repeated horizontal spaces converge
- **WHEN** prose has an existing leading NBSP, tab or repeated horizontal spaces around an em dash
- **THEN** the same canonical horizontal spacing is produced
- **AND** applying the transform again changes nothing
- **AND** newlines, leading dialogue dashes and code retain their structure
