---
name: skill-openspec
description: "Writes and validates OpenSpec artifacts in nuckty repositories. Covers the delta format, lifecycle, and strict validation. Use when creating or changing openspec/ specs; not for docs or code."
---

# OpenSpec

- Spec-driven: no code without an applied change; invariants live in specs.
- `## ADDED/MODIFIED/REMOVED Requirements`, SHALL + WHEN/THEN.
- propose → apply → archive.
- `npx @fission-ai/openspec validate <change> --strict`.
