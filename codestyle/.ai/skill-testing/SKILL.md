---
name: skill-testing
description: "Runs and writes tests in nuckty repositories. Covers test placement, project runners, regression discipline, and the green gate. Use when writing, running, or reporting tests; not for docs or specs."
---

# Testing

- Keep tests in the project’s established test directories. Run them through the project’s npm scripts; use the runner configured there.
- Bug fixes: reproduce first; regression test fails before and passes after when practical.
- Tests MUST be silent on success; fix all warnings before commit.
- After change: `npm run build && npm test` green; `npm run test:coverage` keeps every package above its coverage gate.
