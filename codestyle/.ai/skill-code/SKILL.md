---
name: skill-code
description: "Writes and edits source code in nuckty repositories. Covers TypeScript style, block extensions, dependency policy, moves, and generated output. Use when creating or changing source code; not for tests, docs, or specs."
---

# Code

- TypeScript strict, ESM, 4-space indent.
- Always use braces for control-flow statements, including single-line bodies.
- Put one empty line after a declaration group and before `if` and `return`.
- Prefer narrowing over casts; never suppress type errors with `never`.
- Configs under `config/config-*`.
- Block extensions: sources live in `blocks/` and ship with the package; the deps loader imports `blocks/<name>/<name>.nu.ts` by name — keep file names in sync with block names.
- A `.nu.ts` file imports `block` from `nuckty`, exports `default function templates(): void`, and declares only the block matching its directory. Never use `env.block`, a named `register`, or top-level declarations in a template module.
- CSS follows the shared Stylelint property order; run the project's `lint:fix` instead of formatting source manually.
- Deps: exact versions; `@types/node` tracks the runtime major.
- Use `git mv` to move files; maintain backward compatibility.
- Generated files: edit sources and regenerate; never hand-edit outputs.
