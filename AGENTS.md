# Global
@codestyle/AGENTS.md

# Monorepo
- npm workspaces; `packages/core` first in `workspaces`, extensions build against its `dist/`
- All `@nuckty/*` packages release in lockstep via Changesets; a change to a published package needs a changeset file
- Root `overrides` only; member `overrides` are ignored by npm
- Tool configs follow `config/config-*.*`; `.changeset/`, `openspec/`, `.github/` are tool-mandated exceptions
